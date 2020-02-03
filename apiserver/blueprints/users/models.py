"""
User database client
"""
import click
from apiserver.blueprints.home.models import ODB, get_datetime
from apiserver.models import UserModel as Models
from apiserver.models import OSINTModel
from apiserver.utils import SECRET_KEY, SIGNATURE_EXPIRED, BLACK_LISTED, DB_ERROR, change_if_date,\
    send_mail, HTTPS, randomString, MESSAGE_OPENING, MESSAGE_CLOSING
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import TimedJSONWebSignatureSerializer


class userDB(ODB):

    def __init__(self, db_name="Users"):
        ODB.__init__(self, db_name, models=Models)
        self.db_name = db_name
        self.ICON_SESSION = "TODO"
        self.ICON_POST = "TODO"
        self.ICON_USER = "TODO"
        self.ICON_BLACKLIST = "TODO"
        self.models = Models
        self.auto_users = {
            "GeoAnalyst": "TODO",
            "SocAnalyst": "TODO",
            "HumintAnalyst": "TODO"
        }

    def check_standard_users(self):
        """
        Sets up the initial users as channels to fill Application dependent lists. Users serve standard functions
        that can be used in various automated situations
        TODO only the first user's password works
        :return:
        """
        users = []
        for r in self.client.command('''
        select userName from User 
        '''):
            users.append(r.oRecordData['userName'])
        message = "created with auto users and passwords: "
        i = 1
        for au in self.auto_users:
            if au not in users:
                click.echo('[%s_UserServer_init] Creating auto user %s' % (get_datetime(), au))
                password = randomString(16)
                r = self.create_user({
                    "userName": au,
                    "email": "NetworkGraph@Support.mail",
                    "passWord": password,
                    "confirmed": "true",
                    "icon": self.auto_users[au]
                })
                if i == len(self.auto_users):
                    message += "and USER %d: %s PSWD: %s " % (i, au, password)
                else:
                    message += "USER %d: %s PSWD: %s, " % (i, au, password)
            try:
                # Test logging in with the user and password
                sql = '''select passWord from %s''' % r['data']['key']
                password_hash = self.client.command(sql)[0].oRecordData['passWord']
                r = check_password_hash(password_hash, password)
                if not r:
                    click.echo('[%s_UserServer_init] ERROR with user creation %s' % (get_datetime(), str(e)))
            except Exception as e:
                click.echo('[%s_UserServer_init] ERROR with user creation %s' % (get_datetime(), str(e)))
            i += 1
        # Auto confirm the users
        self.client.command('''update User set confirmed = true''')
        message += "Save the passwords for future reference."
        return message

    def get_user_monitor(self, userName="SocAnalyst"):
        """
        Get the social media channels a user is current subscribed
        :param userName:
        :return:
        """
        sql = '''
        match
        {class:User, where: (userName = '%s')}.out("SubscribesTo")
        {class:Monitor, as:s}.in("SearchesOn")
        {class:Monitor, as:channel, where: (name = 'Twitter')}
        return s.key, s.description, s.searchValue, s.type
        ''' % userName

        return

    def send_message(self, request):
        """
        Create a message and then wire relationships as following
        Session to message for Logging
        Sender to message for Activity of user
        Message to Receiver for Alerting
        :param request:
        :return:
        """
        if str(type(request)) == "<class 'werkzeug.local.LocalProxy'>":
            form = request.form.to_dict()
            sessionId = request.headers['SESSIONID']
        # For internal requests not coming from HTTP
        else:
            form = request
            sessionId = request['sessionId']
        # Create the Message Node
        msg = self.create_node(
            class_name="Message",
            text=form['text'],
            title=form['title'],
            sender=form['sender'],
            receiver=form['receiver'],
            createDate=get_datetime(),
            icon=self.ICON_POST)
        # Create relations from sender to post and post to receiver.
        try:
            senderKey = self.get_user(userName=form['sender'])[0].oRecordData['key']
        except:
            msg['message'] = "No sender identified with key %s" % form['sender']
            return msg
        try:
            receiverKey = self.get_user(userName=form['receiver'])[0].oRecordData['key']
        except:
            msg['message'] = "No receiver identified with key %s" % form['receiver']
            return msg
        msgKey = msg['data']['key']
        msg['message'] = "Message sent from %s with subject %s to %s on %s" % (
            form['sender'], form['title'], form['receiver'], get_datetime())
        self.create_edge(fromNode=sessionId, fromClass="Session", toNode=msgKey, toClass="Message", edgeType="Logged")
        self.create_edge(fromNode=senderKey, fromClass="User", toNode=msgKey, toClass="Message", edgeType="Sent")
        self.create_edge(fromNode=msgKey, fromClass="Message", toNode=receiverKey, toClass="User", edgeType="SentTo")
        # for tag in tags create a new node and relate it TODO
        return msg

    def get_messages(self, **kwargs):
        """
        Get messages associated with the userName and return a list of selectable items for each Sent and Received
        ODB 2.2 requires the select from a match to apply the sorting "order by".
        The sorting of the m_key sets sets the list so a chronology of the message life cycle is shown and loaded
        into the return value.
        The message can be determined as new for a user if there is nothing in the read column. To ensure this is
        consistent for messages received and read by other users, the condition for checking on sender or receiver
        equal to kwargs['userName'] is implemented.
        :param kwargs:
        :return:
        """
        msg_index = {}
        current_key = None
        sql = '''
            select from (match
            {class:User, as:u}.outE()
            {class:E, as:e}.inV()
            {class:Message, as:m, where: (sender = '%s' or receiver = '%s') }
            return u.key, u.userName, 
            e.DTG, e.@class, 
            m.key, m.title, m.icon, m.text, m.sender, m.receiver, m.createDate)
            order by m.key
        ''' % (kwargs['userName'], kwargs['userName'])
        click.echo(sql)
        for msg in self.client.command(sql):
            # If still the current message, add the new information
            if current_key == msg.oRecordData['m_key']:
                if msg.oRecordData['e_DTG'] and (
                        msg_index[current_key]['receiver'] == kwargs['userName'] or
                        msg_index[current_key]['sender'] == kwargs['userName']):
                    msg_index[current_key]['activity'].append({
                        "read_by": msg.oRecordData['m_receiver'],
                        "read_on": msg.oRecordData['e_DTG']
                    })
                    if msg_index[current_key]['read']:
                        new_date = change_if_date(msg.oRecordData['e_DTG'])
                        if new_date > change_if_date(msg_index[current_key]['read']):
                            msg_index[current_key]['read'] = msg.oRecordData['e_DTG']
                    else:
                        msg_index[current_key]['read'] = msg.oRecordData['e_DTG']
            else:
                current_key = msg.oRecordData['m_key']
                msg_index[current_key] = {
                    'key': msg.oRecordData['m_key'],
                    'sender': msg.oRecordData['m_sender'],
                    'receiver': msg.oRecordData['m_receiver'],
                    'title': msg.oRecordData['m_title'],
                    'icon': msg.oRecordData['m_icon'],
                    'text': msg.oRecordData['m_text'],
                    'sent': msg.oRecordData['m_createDate'],
                    'activity': [],
                    'read': False
                }
        data = {'data': [], 'notifications': []}
        for m in msg_index:
            data['data'].append(msg_index[m])
        for m in data['data']:
            if not m['read'] and m['receiver'] == kwargs['userName']:
                data['notifications'].append(m)
        data['count'] = len(data['notifications'])
        data['notifications'].sort(key=lambda item:['key'], reverse=True)
        data['message'] = "Found %s notifications and %s total messages for %s" % (
            len(data['notifications']), len(data['data']), kwargs['userName'])
        return data

    def read_message(self, **kwargs):
        """
        Update a message as read by the receiver with a new edge from the UserKey to the MessageKey
        Return an updated list of messages to refresh the inbox
        :param kwargs:
        :return:
        """
        data = {
            "data": []
        }
        sql = '''
        create edge {edgeType} from 
        (select from {fromClass} where key = {fromNode}) to 
        (select from {toClass} where key = {toNode}) set DTG = '{DTG}'
        '''.format(edgeType="Read", fromNode=kwargs['userKey'], toNode=kwargs['msgKey'],
                   fromClass="User", toClass="Message", DTG=get_datetime())
        try:
            self.client.command(sql)
        except Exception as e:
            click.echo("Error reading message %s" % str(e))

        data['message'] = "Message %s read" % (kwargs['msgKey'])
        return data

    def create_session(self, form, ip_address, token):
        """
        Create an object to track the activities of a user
        :param form:
        :param ip_address:
        :param token:
        :return:
        """
        session = self.create_node(
            class_name="Session",
            startDate=get_datetime(),
            ipAddress=ip_address,
            token=token,
            createDate=get_datetime(),
            user=form['userName'],
            icon=self.ICON_SESSION
        )

        return session

    def get_user_cases(self, userName="SocAnalyst"):
        """
        Check each available database and get the cases that include that user in either Members, Owners, or CreatedBy
        The return should be the complete model for the user to get all related data from in other models. The keys
        :param kwargs:
        :return:
        """
        from apiserver.blueprints.osint.models import OSINT
        osintserver = OSINT()
        osintserver.open_db()
        cases = {"data": [], "Unclassified": 0, "Confidential": 0}
        cOSINT = osintserver.client.command(
            '''select @rid, in, out, * from Case where Members containstext('%s') 
            or CreatedBy containstext('%s') or Owners containstext ('%s')
            ''' % (userName, userName, userName))
        for c in cOSINT:
            c = c.oRecordData
            # If linked then add the case with the role
            caseNode = ({
                "key": c['rid'].get_hash(),
                "Name": c['Name'],
                "CreatedBy": c['CreatedBy'],
                "Owners": c['Owners'],
                "Members": c['Members'],
                "Classification": c['Classification'],
                "StartDate": c['StartDate'],
                "LastUpdate": c['LastUpdate'],
                "data": {"nodes": [], "lines": []}
            })
            if c['Classification'] == "Unclassified":
                cases['Unclassified']+=1
            elif c['Classification'] == "Confidential":
                cases['Confidential']+=1

            cases['data'].append(caseNode)
        if len(cases['data']) == 1:
            c_count = "case"
        else:
            c_count = "cases"

        cases['message'] = "%d %s found for %s" % (len(cases['data']), c_count, userName)
        return cases

    def login(self, request):
        """
        Check the user confirmation status and password based on the supplied userName
        If authenticated, get user relevant data including other users, cases, and alerts available
        :param form:
        :return: token or none
        """

        response = {"received": str(request), "session": None}
        ip_address = request.remote_addr
        form = request.form.to_dict(flat=True)
        r = self.client.command('''
        select passWord, @rid, confirmed, email from User where userName = "{userName}"
        '''.format(userName=form["userName"]))
        if len(r) == 0:
            response["message"] = "No user exists with name {userName}".format(userName=form["userName"])
        else:
            if r[0].oRecordData['confirmed'] == False or str(r[0].oRecordData['confirmed']).lower() == 'false':
                self.confirm_user_email(userName=form['userName'], email=r[0].oRecordData['email'])
                response["message"] = ('''
                Unconfirmed user. A new confirmation message has been
                 sent to the registered email, %s''' % r[0].oRecordData['email'])
            else:
                password = r[0].oRecordData['passWord']
                key = r[0].oRecordData['rid'].get_hash()
                if check_password_hash(password, form['passWord']):
                    # The User is authenticated so fill with all necessary data including session tokens for security
                    token = self.serialize_token(userName=form['userName'])
                    session = self.create_session(form, ip_address, token)
                    self.create_edge_new(fromNode=key, toNode=session['data']['key'], edgeType="UserSession")
                    response["token"] = token
                    response["session"] = session["data"]["key"]
                    # Get the graphs the user can implement in the workbench
                    response["graphs"] = []
                    response["graphs"].append({
                        "Name": "Activity",
                        "key": "Activity",
                        "data": self.get_activity(userName=form['userName'])["data"]
                    })
                    response["graphs"].extend(self.get_user_cases(form['userName'])['data'])
                    # Get the other users so they can be communicated with and added to graphs/cases for collaboration
                    response["users"] = self.get_users()
                    response["models"] = OSINTModel
                else:
                    response["message"] = "Incorrect password"

        return response

    def logout(self, request):
        """
        Look up a session and update the endDate with getTime
        Blacklist the token by creating a blacklist object with the token data
        :param request:
        :return:
        """
        # Look up the session and update the endDate with new getTime
        # Blacklist the token and associate with the Session

        r = request.form.to_dict(flat=True)
        dLOGOUT = get_datetime()
        try:
            self.update(class_name="Session", var="endDate", val=dLOGOUT, key=int(request.headers['SESSIONID']))
            blackListNode = self.create_node(
                class_name="Blacklist",
                createtDate=dLOGOUT,
                token=request.headers['AUTHORIZATION'],
                user=r['userName'],
                session=request.headers['SESSIONID'],
                icon=self.ICON_BLACKLIST
            )

            self.create_edge(edgeType="ClosedSession", fromNode=blackListNode['data']['key'], fromClass="Blacklist",
                             toNode=request.headers['SESSIONID'], toClass="Session")

            return "User {userName} logged out from session {session} at {date}".format(
                userName=r['userName'], session=request.headers['SESSIONID'], date=dLOGOUT)

        except Exception as e:
            if "ValueError" in str(e):
                return "User {userName} session with id {session} for {date} is not valid".format(
                    userName=r['userName'], session=request.headers['SESSIONID'], date=dLOGOUT)
            if request.headers['SESSIONID'] == '':
                return "User {userName} session is blank".format(
                    userName=r['userName'])

    def check_blacklist(self, token):
        """
        If there is a payload in getting a Blacklist with this token val, then it is Blacklisted
        :param token:
        :return:
        """
        bl = self.get_node(class_name="Blacklist", var="token", val=token)
        return bl

    def get_users_nodes(self):
        """
        Get all the non-system users and return them in the form of graph nodes for use in the application
        :return:
        """
        r = self.client.command('''
        select userName, @rid as key, email, createDate, icon, confirmed from User 
        ''')
        users = {"data": []}
        for u in r:
            u = u.oRecordData
            if u['email'] != "Chatbot@email.com" and u['userName'][:6] != "SYSTEM":
                users["data"].append(self.format_node(
                    key=u['key'].get_hash(),
                    icon=u['icon'],
                    class_name="User",
                    title="User %s" % u['userName'],
                    status="Information",
                    attributes=[
                        {"label": "Name", "value": u['userName']},
                        {"label": "Email", "value": u['email']},
                        {"label": "Confirmed", "value": u['confirmed']},
                        {"label": "Created", "value": u['createDate']},
                    ]
                ))

        users['message'] = "Found %d users" % len(users['data'])
        return users

    def get_users(self):
        """
        Get all the non-system users and return them in the form of graph nodes for use in the application
        :return:
        """
        r = self.client.command('''
        select userName from User 
        ''')
        users = []
        for u in r:
            users.append(u.oRecordData['userName'])
        return users

    def get_user(self, **kwargs):

        if "userName" in kwargs.keys():
            r = self.client.command('''
            select userName, email, createDate, @rid from User where userName = "{userName}"
            '''.format(userName=kwargs["userName"]))
        else:
            r = self.client.command('''
            select userName, email, createDate, @rid from User where email = "{email}"
            '''.format(email=kwargs["email"]))

        if len(r) == 0:
            return None
        else:
            return r

    def get_activity(self, **kwargs):

        if 'request' in kwargs:
            userName = kwargs['request'].form.to_dict()['userName']
        else:
            userName = kwargs['userName']

        u = self.get_user(userName=userName)
        if u:
            # Get everything related to the user from the USER database
            r = self.get_neighbors_index(u[0].oRecordData['rid'].get_hash())
            graph = {"nodes": [], "lines": r['data']['lines']}
            if len(r) > 0:
                for n in r['data']['nodes']:
                    new_node = {}
                    for k in n.keys():
                        if k.lower() not in ['hashkey', 'password', 'ext_key']:
                            new_node[k] = n[k]
                    graph['nodes'].append(new_node)
                r = {"data": graph, "message": "%d activities found" % int(len(graph['nodes'])-1)}
            else:
                r = {"data": graph, "message": "No activity found"}
        else:
            r = {"data": None, "message": "No user named {userName} found".format(
                userName=self.get_user(userName=userName))}
        return r

    def create_user(self, form):
        """
        If a user does not exist, encrypt the password for storage and create the user
        Send an email to the user email provided for confirmation process

        :param form:
        :return:
        """
        if not self.get_user(userName=form['userName'], email=form['email']):
            passWord = self.encrypt_password(form['passWord'])
            if "icon" in form.keys():
                icon = form['icon']
            else:
                icon = self.ICON_USER

            userNode = self.create_node(
                class_name="User",
                passWord=passWord,
                userName=form['userName'],
                email=form['email'],
                createDate=get_datetime(),
                icon=icon,
                confirmed="False"
            )
            if userNode and form['userName'] not in self.auto_users.keys():
                self.confirm_user_email(userName=form['userName'], email=form['email'])
                return {
                    "message": "%s, confirm the registration process by using the link sent to %s" % (
                        form['userName'], form['email']),
                    "data": userNode
                }
            elif form['userName'] in self.auto_users.keys():
                return userNode

    def delete_user(self, request):
        u = self.get_user(userName=request.form.to_dict()['userName'])
        if u:
            r = self.delete_node(class_name="User", key=int(u[0].oRecordData['key']))
            return {'data': r, 'message': "{userName} deleted".format(userName=request.form.to_dict()['userName'])}
        else:
            return {'data': None, 'message': "{userName} not found".format(userName=request.form.to_dict()['userName'])}

    def encrypt_password(self, plaintext_password):
        """
        Hash a plaintext string using PBKDF2. This is good enough according
        to the NIST (National Institute of Standards and Technology).

        :param plaintext_password: Password in plain text
        :type plaintext_password: str
        :return: str
        """
        if plaintext_password:
            return generate_password_hash(plaintext_password)

        return None

    def auth_user(self, token):
        auth = self.deserialize_token(token)
        if auth == SIGNATURE_EXPIRED:
            return {
                "status": 204,
                "message": SIGNATURE_EXPIRED
            }
        elif auth == BLACK_LISTED:
            return {
                "status": 204,
                "message": BLACK_LISTED
            }
        elif auth == DB_ERROR:
            return {
                "status": 500,
                "message": DB_ERROR
            }
        else:
            return None

    def deserialize_token(self, token):
        """
        Obtain a user from de-serializing a signed token.

        :param token: Signed token.
        :type token: str
        :return: User instance or None
        """
        private_key = TimedJSONWebSignatureSerializer(SECRET_KEY)
        try:
            if self.check_blacklist(token):
                return BLACK_LISTED
            else:
                decoded_payload = private_key.loads(token)
                return self.get_user(userName=decoded_payload.get('userName'))

        except Exception as e:
            if str(type(e)) == "<class 'itsdangerous.exc.SignatureExpired'>":
                return SIGNATURE_EXPIRED
            elif str(type(e)) == "<class 'pyorient.exceptions.PyOrientSQLParsingException'>":
                return DB_ERROR
            else:
                return None

    def serialize_token(self, userName, expiration=3600):
        """
        Sign and create a token that can be used for things such as resetting
        a password or other tasks that involve a one off token.

        :param expiration: Seconds until it expires, defaults to 1 hour
        :type expiration: int
        :return: JSON
        """
        private_key = SECRET_KEY

        serializer = TimedJSONWebSignatureSerializer(private_key, expiration)
        return serializer.dumps({'userName': userName}).decode('utf-8')

    def confirm(self, **kwargs):
        """
        Use the token sent from the confirm_user_email process to confirm the user
        If the user name is confirmed,
        1) Blacklist the token
        2) Update the user's confirmed statys
        3) Sign the user in through the email link with a new token

        :param kwargs:
        :return:
        """

        userName = self.deserialize_token(token=kwargs['token'])
        if userName not in [DB_ERROR, BLACK_LISTED, None, SIGNATURE_EXPIRED]:
            # Blacklist the token
            blackListNode = self.create_node(
                class_name="Blacklist",
                createtDate=get_datetime(),
                token=kwargs['token'],
                user=userName[0].oRecordData['userName'],
                session='Email confirmation',
                icon=self.ICON_BLACKLIST
            )
            self.create_edge_new(edgeType="ConfirmedEmail", fromNode=blackListNode['data']['key'],
                             toNode=userName[0].oRecordData['rid'].get_hash())

            # Update user data with confirmed
            self.update(var="confirmed", val=True, key=userName[0].oRecordData['rid'].get_hash())

            # Log user in with a new token
            token = self.serialize_token(userName[0].oRecordData['userName'])
            session = self.create_session({"userName": userName[0].oRecordData['userName']}, 'Email', token)
            self.create_edge_new(
                fromNode=userName[0].oRecordData['rid'].get_hash(),
                toNode=session['data']['key'],
                edgeType="UserSession")

            return {
                "status": 200,
                "token": token,
                "session": session,
                "activityGraph": self.get_activity(userName=userName[0].oRecordData['userName']),
                "message": "User %s confirmed email %s and logged in" % (
                    userName[0].oRecordData['userName'],
                    userName[0].oRecordData['email'])
                    }

        elif not userName:
            return {
                "status": 204,
                "token": None,
                "message": "User not found"
            }
        else:
            return {
                "status": 204,
                "token": None,
                "message": userName
            }

    def confirm_user_email(self, **kwargs):
        """
        Expects a userName and email to which it will send a timed token in a link to the HOST_IP
        The email will come from the Configured EMAIL and the link will trigger an authentication process contained in
        the confirm function where...
        The token will be blacklisted and then the user will be updated with a confirmed = True
        :param kwargs:
        :return:
        """
        confirmToken = self.serialize_token(kwargs['userName'])
        confirmLink = "%s/users/confirm/%s" % (HTTPS, confirmToken)
        # Create a standard text format email
        tMessage = '''
        Hello %s,\n
        %s %s
        \tLink: %s \n
        \tToken: %s\n\n
        %s
        ''' % (kwargs['userName'], kwargs['email'], MESSAGE_OPENING, confirmLink, confirmToken, MESSAGE_CLOSING)
        # Create an HTML format email
        hMessage = '''
        <html>
          <head></head>
          <body>
            <p>Hello %s,<br>
            This email was used to %s
            <br>
            <br>Link: 
            <a href="%s">User Activation email link</a>
            <br>Token:
            %s
            <br><br>
            If you have any questions, feel free to reply back with them.
            <br><br>
            Sincerely,
            <br>
            %s
            </p>
          </body>
        </html>
        ''' % (kwargs['userName'], MESSAGE_OPENING, confirmLink, confirmToken, MESSAGE_CLOSING)
        #TODO map link to the environment variables create a link between the user and the token to look up

        # Send the mail
        if send_mail(Recipient=kwargs['email'], tMessage=tMessage, hMessage=hMessage, Subject="Confirmation email"):
            return {
                "message": "email sent",
                "status": 200,
                "data": {
                    "confirmToken": confirmToken,
                    "confirmLink": confirmLink
                }
            }
        else:
            return {
                "message": "error",
                "status": 500}







