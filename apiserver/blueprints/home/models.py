"""
Base class/blueprint/route for all OrientDB based clients. These clients use the pyorient library which is limited to
OrientDB 2.x. The application uses OrientDB 2.37 which is established within a stable Dockerized container. The main
functions include:
"""
import pyorient
import json
import random
import click
import pandas as pd
import numpy as np
import os
import time
import operator
import copy
import hashlib
from apiserver.models import Edges as EdgeModel, nodeKeys, POLEModel
from apiserver.utils import get_datetime, HOST_IP, change_if_number, clean, clean_concat, date_to_standard_string, \
    ODB_USER, ODB_PSWD

OSINT = "OSINT"

class ODB:

    def __init__(self, db_name="GratefulDeadConcerts", models=POLEModel):

        self.client = pyorient.OrientDB(HOST_IP, 2424)
        self.user = ODB_USER
        self.pswd = ODB_PSWD
        self.db_name = db_name
        self.path = os.getcwd()
        self.datapath = os.path.join(self.path, 'data')
        self.mapspath = os.path.join(self.datapath, 'maps.json')
        # Keeping the nodeKeys in this order assures that matches will be checked in the same consistent string
        self.nodeKeys = nodeKeys
        self.models = models
        self.get_maps()
        self.standard_classes = ['OFunction', 'OIdentity', 'ORestricted',
                                 'ORole', 'OSchedule', 'OSequence', 'OTriggered',
                                 'OUser', '_studio' ]

    def get_maps(self):
        """
        Called by the init function to load the models stored to the file system into
        the application for matching against incoming models needed for ETL graph
        translation
        :return:
        """
        with open(self.mapspath, 'r') as f:
            self.maps = json.load(f)

    def save_model_to_map(self, model):
        """
        Expects a model which will reference a file already in the system
        :return:
        """
        if model["Name"] in self.maps.keys():
            return

        self.maps[model["Name"]] = {
            "Entities": model["Entities"],
            "Relations": model["Relations"],
            "headers": model["headers"]
        }
        with open(self.mapspath, 'w') as f:
            json.dump(self.maps, f)

    def file_to_frame(self, filename):
        try:
            if filename[-4:] == "xlsx":
                return {"data": pd.read_excel(os.path.join(self.datapath, filename))}
            elif filename[-3:] == "csv":
                return {"data": pd.read_csv(os.path.join(self.datapath, filename))}
            else:
                return {
                    "data": None,
                    "headers": None,
                    "ftype": "Unknown",
                    "message": "Rejected %s." % (filename)
                }
        except Exception as e:
            if "No such file or directory" in str(e):
                return {
                    "data": None,
                    "headers": None,
                    "ftype": "Unknown",
                    "message": "No file loaded to the directory with name %s. Try uploading again." % (filename)
                }

    def file_to_graph(self, filename):
        """
        Based on acceptable file extensions but not necessarily known file types in terms of content, the function
        checks which of the acceptable extensions the file is so that it can change it into a standard format to read.
        In most cases tabular data is expected in which Pandas dataframes provide a way to get the headers and data into
        a dictionary/JSON friendly format.

        If the file is recognized based on keys and the matched model extraction is successfully completed, it will
        return data as a graph. If not the data is returned as a sample of the file to provide content for configuration.
        :param filename:
        :return:
        """
        file = self.file_to_frame(filename)
        if str(type(file["data"])) != "<class 'pandas.core.frame.DataFrame'>":
            return file
        else:
            file = file["data"]
        check = self.file_type_check(file.keys())
        check["size"] = str(os.stat(os.path.join(self.datapath, filename)).st_size) + " bytes"
        check["source"] = filename
        if check["score"] > .9999:
            click.echo(check["name"])
            click.echo(self.maps[check["name"]])
            data = self.graph_etl_model({
                "Name": check["name"],
                "Entities": self.maps[check["name"]]["model"]["Entities"],
                "Relations": self.maps[check["name"]]["model"]["Relations"],
            }, file)
            return {
                "data": data,
                "ftype": check,
                "message": "Uploaded file with file type model %s." % (check["name"])
            }
        elif check["score"] > 0:
            # Can check if the file run against the model works but do so with a try to return the result
            try:
                data = self.graph_etl_model(file)
                message = "Uploaded file with model type %s." % (check["name"])
                return {
                    "data": data,
                    "ftype": check,
                    "message": message
                }
            except Exception as e:
                message = "Attempted with %s file type model but file is missing %s" % (
                    check["name"], str(e)
                )
                return {
                    "headers": list(file.columns),
                    "data": file.sample(n=10).fillna(value="null").to_dict(),
                    "ftype": check,
                    "message": message
            }
        else:
            return {
                "data": file.sample(n=10).fillna(value="null").to_dict(),
                "headers": list(file.columns),
                "ftype": check,
                "message": "Could not identify the file type. Prepared %s for configuration." % (filename)
            }

    def graph_etl_model(self, model, data):
        """
        The model should be a dictionary containing all the entities and their attributes. The attributes are mapped
        to headers within the data which is expected to be in a tabular format.
        Data
            Animal_name: [Abe, Babe...]
            Animal_color: [Red, Blue...]
        Model
            Entities:
                Animal: {Id: key, name : Animal_name}
                Color: {Id: key, label: Animal_color}
            Relations:
                HasColor: {from: Animal, to: Color}

        Includes a function for etl processing of node
        Includes checking if the model is saved for file_type_check and then calling that model

        :param model:
        :param data:
        :return:
        """
        self.save_model_to_map(model)
        etl_source = model['Name']
        node_index = {}
        graph = {"nodes": [], "lines": [], "n_index": []}
        # Ensure the data received is changed into a DataFrame if it is not already
        if str(type(data)) != "<class 'pandas.core.frame.DataFrame'>":
            file = self.file_to_frame(data)
            if str(type(file["data"])) != "<class 'pandas.core.frame.DataFrame'>":
                return file
            else:
                data = file["data"]

        def get_key(**kwargs):
            """
            Handles node creation based on the local node_index and the local create_node function.
            The node expects an icon and class_name (EntityType)
            expects an Icon with a key but if there is none it will create it
            :param kwargs:
            :return:
            """
            # Check if it has been created based on attributes and return the corresponding key or create a new node
            h_key = self.hash_node(kwargs)
            if h_key in node_index.keys():
                return node_index[h_key]
            else:
                try:
                    new_node = self.create_node(**kwargs)["data"]
                    node_index[h_key] = new_node["key"]
                    graph["nodes"].append(new_node)
                    return new_node["key"]
                except Exception as e:
                    print(str(e))
                    return None

        for index, row in data.iterrows():

            if index != 0:
                # Based on the entities in the model, get IDs that can be used to create relationships
                rowConfig = {}
                badRow = False
                for entity in model["Entities"]:
                    # The extracted entity is based on the model and mapped row value to entity attributes
                    # If the class_name is not in the models then it should be created as a Category of an Object class
                    if "className" in model["Entities"][entity].keys():
                        extractedEntity = {"class_name": model["Entities"][entity]["className"], "source": etl_source}
                    elif entity in self.models.keys():
                        extractedEntity = {"class_name": entity, "source": etl_source}
                    else:
                        extractedEntity = {"class_name": "Object", "entity": entity, "source": etl_source}
                    # Check if there is a description, otherwise set it up to auto create a description
                    if "description" not in model["Entities"][entity]:
                        extractedEntity['description'] = ""
                        autoDescribe = True
                    else:
                        autoDescribe = False
                    for att in model["Entities"][entity]:
                        # If the attribute is in the row headers then it is to be mapped otherwise it is a custom value

                        if model["Entities"][entity][att] in row.keys():
                            val = row[model["Entities"][entity][att]]
                            try:
                                clean_val = val.to_pydatetime()
                            except:
                                clean_val = val

                            extractedEntity[att] = clean_val
                        else:
                            extractedEntity[att] = model["Entities"][entity][att]
                            clean_val = model["Entities"][entity][att]
                        if autoDescribe:
                            clean_val = date_to_standard_string(clean_val)
                            extractedEntity['description'] = extractedEntity['description'] + str(clean_val) + " "
                    # Check if this Entity has already been extracted and get the key.
                    # The function also adds the entity to the graph which will be exported
                    exEntityKey = get_key(**extractedEntity)
                    if not exEntityKey:
                        badRow = True
                    if exEntityKey in graph["n_index"]:
                        graph["n_index"].append(exEntityKey)
                    # Add the entity key to its spot within the mapping configuration so the lines can be built
                    rowConfig[entity] = exEntityKey
                if not badRow:
                    # Use the entity names that are saved into the relation to and from to assign the row config entity key
                    for line in model["Relations"]:
                        if({"to": rowConfig[model["Relations"][line]["to"]], "from": rowConfig[model["Relations"][line]["from"]], "description": line }) not in graph["lines"]:
                            graph["lines"].append({
                                "to": rowConfig[model["Relations"][line]["to"]],
                                "from": rowConfig[model["Relations"][line]["from"]],
                                "description": line,
                            })
                        self.create_edge_new(
                            fromNode=rowConfig[model["Relations"][line]["from"]],
                            toNode=rowConfig[model["Relations"][line]["to"]],
                            edgeType=line
                        )

        return graph

    def get_latlon(self):
        return np.random.normal(0, 45)

    def get_status(self, status):

        if status in ["Active", "2", "10", "Created", "Approved", "Completed"]:
            return "Success"
        if status in ["Inactive", "Deletion Request", "Ready for Decision", "Canceled"]:
            return "Error"
        if status in ["To be Archived", "Closed", "Flagged for Archiving", "Released"]:
            return "Warning"

    def make_line(self, **kwargs):
        if ({"to": kwargs['r_to']["key"], "from": kwargs['r_from']["key"],
             "description": kwargs['r_type']}) not in kwargs["r"]['lines']:
            kwargs["r"]['lines'].append({"to": kwargs['r_to']["key"], "from": kwargs['r_from']["key"], "description": kwargs['r_type']})

        return kwargs["r"]

    def check_node(self, n_dict, r):
        newKey = self.hash_node(n_dict)
        if newKey not in r['index']:
            r['index'].append(n_dict['key'])
            r['nodes'].append(n_dict)

        return n_dict, r

    def hash_node(self, node):

        node_id = ""
        for k in node.keys():
            node_id+=str(node[k])
            node_id = hashlib.md5(str(node_id).encode()).hexdigest()

        return node_id

    def file_type_check(self, key_list):
        """
        Expects a set of keys to compare to the known keys.
        Compares the lists to return the file type with the max score
        :param key_list:
        :return:
        """
        key_list = [x.lower().replace(' ', '') for x in key_list.to_list()]
        score = {}
        for ftype in self.maps:
            score[ftype] = 0
            for k in key_list:
                if k in self.maps[ftype]["headers"]:
                    score[ftype]+=1
        for ftype in score:
            if score[ftype] > 0:
                score[ftype] = len(key_list) / len(self.maps[ftype]["headers"])
        ftype = max(score.items(), key=operator.itemgetter(1))[0]
        if score[ftype] == 0:
            check = {
                "name": None,
                "score": 0
            }
        # Divide the length of the key_list with the length of the ftype.keys to return a probability rather than integer
        else:
            check = {
                "name": ftype,
                "score": score[ftype]
            }
        return check

    def create_edge_new(self, edgeType="Related", fromNode=None, toNode=None):
        """
        Create an edge based on the Record ID
        :param edgeType:
        :param fromNode:
        :param toNode:
        :return:
        """
        if fromNode and toNode:
            sql = '''
            create edge {edgeType} from {fromNode} to {toNode}
            '''.format(edgeType=edgeType, fromNode=fromNode, toNode=toNode)
            try:
                self.client.command(sql)
            except Exception as e:
                # Edges have an index to prevent the same relationship forming between the same nodes
                if str(type(e)) != "<class 'pyorient.exceptions.PyOrientORecordDuplicatedException'>":
                    click.echo('[%s_%s_create_edge] Error creating edge: %s \n%s' % (
                        get_datetime(), self.db_name, str(e), sql))
        else:
            click.echo('[%s_%s_create_edge] Did not receive expected arguments' % (get_datetime(), self.db_name))

    def create_edge(self, **kwargs):
        """
        TODO replace all uses of this method with new version
        :param kwargs:
        :return:
        """
        if self.check_index_edges("%sTo%sFrom%s" % (kwargs['edgeType'], kwargs['fromNode'], kwargs['toNode'])):
            return
        else:
            self.index['edges'].append("%sTo%sFrom%s" % (kwargs['edgeType'], kwargs['fromNode'], kwargs['toNode']))
        if change_if_number(kwargs['fromNode']) and change_if_number(kwargs['toNode']):
            sql = '''
            create edge {edgeType} from 
            (select from {fromClass} where key = {fromNode}) to 
            (select from {toClass} where key = {toNode})
            '''.format(edgeType=kwargs['edgeType'], fromNode=kwargs['fromNode'], toNode=kwargs['toNode'],
                       fromClass=kwargs['fromClass'], toClass=kwargs['toClass'])

        elif change_if_number(kwargs['fromNode']):
            sql = '''
            create edge {edgeType} from 
            (select from {fromClass} where key = {fromNode}) to 
            (select from {toClass} where key = '{toNode}')
            '''.format(edgeType=kwargs['edgeType'], fromNode=kwargs['fromNode'], toNode=kwargs['toNode'],
                       fromClass=kwargs['fromClass'], toClass=kwargs['toClass'])
        elif change_if_number(kwargs['toNode']):
            sql = '''
            create edge {edgeType} from 
            (select from {fromClass} where key = '{fromNode}') to 
            (select from {toClass} where key = {toNode})
            '''.format(edgeType=kwargs['edgeType'], fromNode=kwargs['fromNode'], toNode=kwargs['toNode'],
                       fromClass=kwargs['fromClass'], toClass=kwargs['toClass'])
        else:
            sql = '''
            create edge {edgeType} from 
            (select from {fromClass} where key = '{fromNode}') to 
            (select from {toClass} where key = '{toNode}')
            '''.format(edgeType=kwargs['edgeType'], fromNode=kwargs['fromNode'], toNode=kwargs['toNode'],
                       fromClass=kwargs['fromClass'], toClass=kwargs['toClass'])


        try:
            self.client.command(sql)
            return True
        except Exception as e:
            # Edges have an index to prevent the same relationship forming between the same nodes
            if str(type(e)) != "<class 'pyorient.exceptions.PyOrientORecordDuplicatedException'>":
                click.echo('[%s_%s_create_edge] Error creating edge: %s \n%s' % (
                    get_datetime(), self.db_name, str(e), sql))
            else:
                return True

    def create_node(self, **kwargs):
        """
        Use the idseq to iterate the key and require a class name to create the node
        Go through the properties and add a new piece to the sql statement for each using a label and values for insert
        Only insert statements return values and the key is needed
        While creating the sql, save attributes for formatting to a SAPUI5 node
        If there is a key, set the key as the label but wait to determine if the key is a number or string before
        adding to the values part of the sql insert statement
        Create a hashkey that will be used to resolve entity keys on merged entities
        TODO Method to update the hashkey on merge and another method to add the multiple hashkeys to the index.
        index: {entity1: 1, entityOne, 1}
        Add the node to the index

        :param kwargs: str(db_name), str(class_name), list(properties{property: str, value: str)
        :return:
        """
        attributes = []
        '''
        In the case attributes as an array is received instead of directly in kwargs, flatten the attributes and then 
        pop attributes out
        '''
        if 'attributes' in kwargs.keys():
            if type(kwargs['attributes']) == list:
                attributes = kwargs['attributes']
                for a in kwargs['attributes']:
                    # Ensure the labels received don't break the sql
                    for i in ["'", '"', "\\", "/", ",", ".", "-", "?", "%", "&", " ", "\r", "\n", "\t", " "]:
                        a['label'] = a['label'].replace(i, "_")
                        newVal = change_if_number(a['value'])
                        if newVal:
                            kwargs[a['label']] = newVal
                        else:
                            kwargs[a['label']] = str(a['value']).replace("\r", "_")
                kwargs.pop('attributes')

        # Check the Vertex Class
        if 'class_name' in kwargs.keys() or 'EntityType' in kwargs.keys():
            if 'EntityType' in kwargs.keys():
                kwargs["class_name"] = kwargs["EntityType"]
        else:
            kwargs["class_name"] = "V"
        '''
        Check if there already an associated key type attribute and make it the external key. If more than one, add it 
        as a new key iterating with the more_than_one_key mtoka token. There must be only a single "key" attribute to
        identify the Node. Therefore, this process ensures the key is iterated according to the DB identification. But
        the hashing process and external keys allow means for searching on the node. While checking the flattened
        attributes, check if there are other node formatting attributes that can be normalized. 
        '''
        icon = title = status = None
        mtoka = 0
        node_prep = copy.deepcopy(kwargs)

        if "Ext_key" not in kwargs.keys():
            for key_attribute in kwargs.keys():
                if key_attribute in ["key", "GUID", "guid", "uid", "Key", "id"]:
                    if mtoka == 0:
                        node_prep["Ext_key"] = kwargs[key_attribute]
                    else:
                        node_prep["Ext_key_%d" % mtoka] = kwargs[key_attribute]
                    mtoka+=1
                elif key_attribute in ["icon", "title", "status"]:
                    if key_attribute == "icon":
                        icon = kwargs[key_attribute]
                    if key_attribute == "title":
                        title = kwargs[key_attribute]
                    if key_attribute == "status":
                        status = kwargs[key_attribute]
            if "key" in kwargs.keys():
                node_prep.pop("key")
            if "Key" in kwargs.keys():
                node_prep.pop("Key")
            node_prep["Ext_key"] = None

        # Check the index based in the hashkey and class_name
        hash_key, check = self.check_index_nodes(**kwargs)
        if check:
            formatted_node = self.format_node(
                key=hash_key,
                class_name=node_prep['class_name'],
                title=title,
                status=status,
                icon=icon,
                attributes=attributes
            )
            message = '[%s_%s_create_node] Node exists' % (get_datetime(), self.db_name)
            return {"message": message, "data": formatted_node}
        # Start the SQL based on the hashkey
        labels = "(hashkey"
        values = "('%s'" % hash_key
        for k in node_prep.keys():
            if list(node_prep.keys())[-1] == k:
                # Close the labels and values with a ')'
                close = ")"
            else:
                close = ""
            labels = labels + ", %s%s" % (k.replace(" ", ""), close)
            # Check if there is an Ext Key. If there is not the sequencer is needed
            if k == "Ext_key":
                if node_prep[k] == None:
                    values = values + ", sequence('idseq').next()%s" % close
                else:
                    values = values + ", '%s'%s" % (clean(node_prep[k]), close)
            else:
                if change_if_number(node_prep[k]):
                    values = values + ", %s%s" % (node_prep[k], close)
                else:
                    values = values + ", '%s'%s" % (clean(node_prep[k]), close)

            if k == 'icon':
                icon = node_prep[k]
            if k == 'node_prep':
                title = node_prep[k]
            if k == 'status':
                status = node_prep[k]
            if k != 'passWord':
                attributes.append({"label": k, "value": node_prep[k]})
        sql = '''
        insert into {class_name} {labels} values {values} return @rid
        '''.format(class_name=node_prep['class_name'], labels=labels, values=values)
        try:
            r = self.client.command(sql)[0].get()
            formatted_node = self.format_node(
                key=r,
                class_name=node_prep['class_name'],
                title=title,
                status=status,
                icon=icon,
                attributes=attributes
            )
            message = '[%s_%s_create_node] Create node %s' % (get_datetime(), self.db_name, r)
            return {"message": message, "data": formatted_node}

        except Exception as e:
            if str(type(e)) == str(type(e)) == "<class 'pyorient.exceptions.PyOrientORecordDuplicatedException'>":
                if node_prep['class_name'] == "Case":
                    node = self.get_node(val=node_prep['Name'], var="Name", class_name="Case")
                    return {"data" :{"key": node['key']}}
                elif "hashkey" in str(e):
                    dup = "previously assigned to the record"
                    rec = str(e)[str(e).find(dup):str(e).find(dup) + len(dup) + 15]
                    node_hash = rec[rec.find("#"):rec.find("\r")]
                    node = self.get_node(val=node_hash, var="record")
                    return {"data": self.format_node(**node), "message": "duplicate blocked"}

            message = '[%s_%s_create_node] ERROR %s\n%s' % (get_datetime(), self.db_name, str(e), sql)
            '''
            If it is a key error or duplication then need to return the formatted_node of the record that exists,
            preventing the creation
            '''
            click.echo(message)
            return message

    def check_index_nodes(self, **kwargs):
        """
        TODO: evaluate method for robustness in terms of unique values produced. This can be tested with the edges
        created between nodes. For example, prior to implementing 'token' and 'session' all users would be associated
        with the same sessions and tokens.
        Use the nodeKeys to cycle through in sequential order and match the input attributes to build a hash string in
        the same format of previous nodes. If the node exists, return the key. Otherwise return None.
        self.nodeKeys = ['class_name', 'title', 'FirstName', 'LastName', 'Gender', 'DateOfBirth', 'PlaceOfBirth',
                    'Name', 'Owner', 'Classification', 'Category', 'Latitude', 'Longitude', 'userName',
                    'EndDate', 'StartDate', 'DateCreated', 'Ext_key', 'category', 'pid', 'name', 'started', 'email',
                    'searchValue', 'ipAddress', 'token', 'session', 'PhoneNumber', 'source', 'Entity']
        Return the key of the
        :param kwargs:
        :return:
        """
        hash_str = ""
        for k in self.nodeKeys:
            if k in kwargs.keys():
                if kwargs[k] != "":
                    # Remove commas since this will be a str treated as a list
                    hash_str = hash_str + k + str(kwargs[k])
                    hash_str = clean_concat(hash_str).replace(",", "")
        # Change the str to a hash string value
        hash_str = hashlib.md5(str(hash_str).encode()).hexdigest()
        if "class_name" in kwargs.keys():
            index_str = "%s_hashkey" % kwargs['class_name']
            r = self.client.command('''
            select from index:%s where key = '%s'
            ''' % (index_str, hash_str))
            if len(r) < 1:
                return hash_str, False
            else:
                return r[0].oRecordData["rid"].get_hash(), True

    def check_index_edges(self, edge):
        """
        Use the edge hash to check if it is in the index
        :param kwargs:
        :return:
        """
        if edge in self.index['edges']:
            return True
        else:
            return False

    def get_hash_keys(self):
        """
        Get the key, hash_key pair that is used for the index
        :return:
        """
        r = self.client.command('''
        select key, hash from V
        ''')

    def create_index(self):
        """
        Fill the index of a database to be used for entity resolution in data collection
        :return:
        """

        self.open_db()
        r = self.client.command('''
        select key, hashkey, title, class_name,  
        DateOfBirth, PlaceOfBirth, FirstName, LastName, Gender, 
        Name, Owner, Classification,
        Category, Latitude, Longitude, Description, 
        EndDate, StartDate, DateCreated, 
        In().key as InKeys, OUT().key as OutKeys, OutE().@class, InE().@class from V
        ''')
        for i in r:
            hash = ""
            rec = i.oRecordData
            # Create a single string to assign to the key TODO change to get hashkey and sep where comma
            for k in self.nodeKeys:
                if k in rec.keys():
                    if rec[k] != "":
                        hash+=str(rec[k])
            hash = clean_concat(hash)
            if hash not in self.index.keys():
                self.index['nodes'][hash] = rec['key']
            # Make
            if len(rec['OutKeys']) > 0:
                if len(rec['OutKeys']) == len(rec['OutE']):
                    for rkey, rtyp in zip(rec['OutKeys'], rec['OutE']):
                        self.index['edges'].append("%sTo%sFrom%s" % (rtyp, rec['key'], rkey))
            if len(rec['InKeys']) > 0:
                if len(rec['InKeys']) == len(rec['InE']):
                    for rkey, rtyp in zip(rec['InKeys'], rec['InE']):
                        self.index['edges'].append("%sTo%sFrom%s" % (rtyp, rkey, rec['key']))

        click.echo('[%s_%s_create_index] Created index with %s nodes and %s edges' % (
            get_datetime(), self.db_name, len(self.index['nodes']), len(self.index['edges'])))

    def create_db(self):
        """
        Build the schema in OrientDB using the models established in __init__
        1) Cycle through the model configuration
        2) Use custom rules as part of the model to trigger an index
        Index documentation can be found at https://orientdb.com/docs/2.0/orientdb.wiki/Indexes.html
        HASH UNIQUE is used for ensuring no duplication of nodes with external keys and ids otherwise
        HASH NOT UNIQUE is used for looking up Category types
        :return:
        """
        created = True
        try:
            self.client.db_create(self.db_name, pyorient.DB_TYPE_GRAPH)
            click.echo('[%s_%s_create_db] Starting process...' % (get_datetime(), self.db_name))
            sql = ""
            for m in self.models:
                sql = sql+"create class %s extends %s;\n" % (m, self.models[m]['class'])
                for k in self.models[m].keys():
                    if k != 'class':
                        sql = sql+"create property %s.%s %s;\n" % (m, k, self.models[m][k])
                        # Custom rules for establishing indexing
                        if (str(k)).lower() in ["key", "id", "uid", "userid", "hashkey", "ext_key", "screen_name"] \
                                or (self.db_name == "Users" and str(k).lower == "username")\
                                or (m == "Case" and k == "Name"):
                            sql = sql + "create index %s_%s on %s (%s) UNIQUE_HASH_INDEX ;\n" % (m, k, m, k)
                        elif (str(k)).lower() in ["category"]:
                            sql = sql + "create index %s_%s on %s (%s) NOTUNIQUE_HASH_INDEX ;\n" % (m, k, m, k)
            sql = sql + "create sequence idseq type ordered;"
        except Exception as e:
            click.echo('[%s_create_db_%s] ERROR with statement build: %s' % (get_datetime(), self.db_name, str(e)))
            created = False

        if created:
            try:
                self.client.batch(sql)
                click.echo('[%s_create_db_%s] Completed nodes' % (get_datetime(), self.db_name))
                self.create_text_indexes()
                created = True
            except Exception as e:
                click.echo('[%s_create_db_%s] ERROR with batch: %s: \n%s' % (get_datetime(), self.db_name, str(e), sql))
                created = False
            try:
                click.echo('[%s_create_db_%s] Creating Edges' % (get_datetime(), self.db_name))
                sql = ""
                for m in EdgeModel:
                    sql = sql + "create class %s extends %s;\n" % (m, EdgeModel[m]['class'])
                    for k in EdgeModel[m].keys():
                        if k != 'class':
                            sql = sql + "create property %s.%s %s;\n" % (m, k, EdgeModel[m][k])
                    sql = sql + "create index %s.out_in on %s (out, in) UNIQUE;\n" % (m, m)
            except Exception as e:
                click.echo('[%s_create_db_%s] ERROR with statement build: %s' % (get_datetime(), self.db_name, str(e)))
            try:
                self.client.batch(sql)
                click.echo('[%s_create_db_%s] Completed Edges' % (get_datetime(), self.db_name))
            except Exception as e:
                click.echo('[%s_create_db_%s] ERROR: with batch %s:  \n%s' % (get_datetime(), self.db_name, str(e), sql))

        return created

    def open_db(self):
        """
        Open the Database for use by establishing the client session based on the user and password. If it doesn't exist
        return a message that let's the user to know
        :return:
        """
        try:
            self.client.connect(self.user, self.pswd)
        except Exception as e:
            click.echo('[%s_get_neighbors_index] ERROR opening DB %s' % (get_datetime(), str(e)))
            return True
        if self.client.db_exists(self.db_name):
            self.client.db_open(self.db_name, self.user, self.pswd)
            return False
        else:
            return "%s doesn't exist. Please initialize through the API."

    def get_neighbors_index(self, nodekey=1):
        """
        Optimize get_neighborsB with use of indexes. Use traverse to get all relations within 2 steps, or direct nodes
        Produces a graph with nodes and lines
        :param kwargs:
        :return:
        """
        sql = "TRAVERSE * from %s WHILE $depth <= 2" % nodekey
        click.echo('[%s_get_neighbors_index] Getting the full entity %s' % (get_datetime(), nodekey))
        # Run the first sql to get the full entity with neighbors
        r = self.client.command(sql)
        graph = {"nodes": [], "lines": [], "index": []}
        # class_name determines if the line is a node or an edge
        for i in r:
            temp = i.oRecordData
            if "class_name" in temp.keys(): # It is a node
                node = {"key": i._rid}
                if node['key'] not in graph['index']:
                    for a in temp:
                        if a[:2] != "_in" and a[:3] != "_out" and "pyorient." not in str(type(temp[a])):
                            node[a] = temp[a]
                    graph['nodes'].append(node)
                    graph['index'].append(node['key'])
            else:  # It is an edge
                line_key = "%s%s%s" %(i._class, temp['out'].get_hash(), temp['in'].get_hash())
                if line_key not in graph['index']:
                    graph['index'].append(line_key)
                    graph["lines"].append({"description": i._class, "from": temp['out'].get_hash(), "to": temp['in'].get_hash()})

        return {"message": "Retrieved %d neighbors for %s" % (len(graph['nodes'])-1, nodekey),  "data": graph}

    def get_node(self, class_name="V", var=None, val=None):
        """
        Return a node based on the class_name, variable of the class and value of the variable.
        TODO base only on index searches
        :param class_name:
        :param var:
        :param val:
        :return:
        """
        if var and val:
            if var == "record":
                sql = '''select * from %s''' % val
            else:
                sql = ('''
                select *, @rid from {class_name} where {var} = '{val}'
                ''').format(class_name=class_name, var=var, val=val)
            r = self.client.command(sql)
            if len(r) > 0:
                raw = r[0].oRecordData
                if "key" not in raw.keys():
                    raw["key"] = r[0]._rid
                try:
                    node = self.format_node(raw)
                except Exception as e:
                    try:
                        node = self.format_node(**raw)
                    except Exception as e:
                        print(str(e))
                return node
        else:
            return None

    def get_db_stats(self):

        return({
            "name": self.db_name,
            "size": self.client.db_size(),
            "records": self.client.db_count_records(),
            "details": self.get_db_details(self.db_name)})

    def get_db_details(self, db_name):

        schema = self.client.command('''select expand(classes) from metadata:schema ''')
        details = []
        for s in schema:
            s = s.oRecordData
            if s['name'] not in self.standard_classes:
                try:
                    props = s['properties']
                    f_props = ""
                    prop_list = []
                    for p in props:
                        f_props = f_props + p['name'] + "\n"
                        prop_list.append(p['name'])
                    details.append(
                      {'name': s['name'],
                       'clusterIds': s['clusterIds'],
                       'properties': f_props,
                       'prop_dict': props,
                       'prop_list': prop_list
                       }
                    )
                except:
                    pass

        return details

    def get_data(self):
        return self.open_file(os.path.join(self.datapath, "netgraph.json"))

    def open_file(self, filename):
        """
        Open any file type and normalize into an dictionary object with the payload stored in
        a pandas dataframe or a json
        :param filename:
        :return: dict data
        """

        ftype = filename[filename.rfind('.'):]
        data = {'status': True, 'filename': filename, 'ftype': ftype}
        if ftype == '.csv':
            data['d'] = pd.read_csv(filename)
        elif ftype == '.xls' or type == '.xlsx':
            data['d'] = pd.read_excel(filename)
        elif ftype == '.json':
            try:
                with open(filename, 'r') as f:
                    data['d'] = json.load(f)
            except Exception as e:
                click.echo('[%s_%s_open_file] Failed to open %s\n%s' % (get_datetime(), self.db_name, filename, str(e)))

        elif ftype == '.txt':
            with open(filename) as f:
                for line in f:
                    (key, val) = line.split()
                    data[int(key)] = val
        else:
            data['status'] = False
            data['d'] = "File %s not in acceptable types" % ftype

        data['basename'] = os.path.basename(filename)
        data['file_size'] = os.stat(filename).st_size
        data['create_date'] = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.stat(filename).st_atime))

        return data

    def update(self, **kwargs):

        sql = ('''
          update {key} set {var}='{val}'
          ''').format(var=kwargs['var'], val=kwargs['val'], key=kwargs['key'])
        r = self.client.command(sql)

        if len(r) > 0:
            return r
        else:
            return None

    def delete_node(self, **kwargs):

        sql = ('''
          delete vertex {class_name} where key = {key}
          ''').format(class_name=kwargs['class_name'], key=kwargs['key'])
        r = self.client.command(sql)

        if len(r) > 0:
            return r
        else:
            return None

    def format_node(self, **kwargs):
        """
        Create a formatted node where title, status and icons are used
        :param kwargs:
        :return:
        """
        if 'icon' not in kwargs.keys():
            kwargs['icon'] = "sap-icon://add"
        if 'class_name' not in kwargs.keys():
            kwargs['class_name'] = 'No class name'
        if 'title' not in kwargs.keys():
            kwargs['title'] = kwargs['class_name']
        if 'status' not in kwargs.keys():
            kwargs['status'] = random.choice(['Information', 'Success', 'Error', 'Warning', 'None'])

        if "attributes" not in kwargs.keys():
            atts = []
            for k in kwargs.keys():
                if str(k).lower() not in ["hashkey", "key", "icon", "class_name", "title"] and "pyorient" not in str(type(kwargs[k])):
                    atts.append({"label": k, "value": kwargs[k]})
            kwargs["attributes"] = atts

        node_format = {
            "key": kwargs['key'],
            "title": kwargs['title'],
            "status": kwargs['status'],
            "icon": kwargs['icon'],
            "attributes": kwargs['attributes']
        }

        return node_format

    def quality_check(self, graph):
        """
        Create a chrono view and geo view from a graph
        :param graph:
        :return:
        """

        node_keys = []
        group_keys = [{"key": "NoGroup", "title": "NoGroup" }]

        if "groups" in graph.keys():
            for g in graph['groups']:
                if ({"key": g['key'], "title": g['title']}) not in graph['groups']:
                    group_keys.append({"key": g['key'], "title": g['title']})

        graph['groups'] = group_keys

        if "nodes" in graph.keys() and "lines" in graph.keys():
            for n in graph['nodes']:
                node_keys.append(n['key'])
                if "group" in n.keys():
                    if {"key": n['group'], "title": n['group']} not in group_keys:
                        graph['groups'].append({'key': n['group'], 'title': n['group']})
                else:
                    n['group'] = "NoGroup"
            for l in graph['lines']:
                if l['to'] not in node_keys:
                    click.echo("Relationship TO with %s not found in nodes. Creating dummy node.")
                    graph['nodes'].append(self.create_node(key=l['to'], class_name="Object"))
                if l['from'] not in node_keys:
                    click.echo("Relationship TO with %s not found in nodes. Creating dummy node.")
                    graph['nodes'].append(self.create_node(key=l['from'], class_name="Object"))
        else:
            click.echo("Missing nodes or lines")
            return None
        return graph

    def merge_nodes(self, **kwargs):
        """
        Enforces the value of a 3 step process in which records are assigned a single key based on DB sequence but also
        a hashkey that represents several instances of the same record. The first step is to normalize all new records
        into a hashkey that uses basic attributes/fields of a record. The normalization process changes the record into
        a lowercase string with all spaces and punctuation removed. For example a person's names and DoB if available are
        reduced. Then the record is hashed and compared against an index of DB_key and hash pairs. A DB_Key to hash_pair
        is 1 to many. When a new record is created, the hash_key is compared to the index and assigned to the key of that
        hashed normalized string. This reduces entire bodies of text down to a single hash that can be compared. When
        merged, the B record is destroyed and replaced with the A key.
        Input: node_A key, node_B key
        Get the hash of each
        Update the node_A hash_str to be a combination of the 2 with a , sep
        Update the index by changing the key of the node_B hash to the node_A key
        :param kwargs:
        :return:
        """
        if 'node_A' in kwargs.keys() and 'node_B' in kwargs.keys():
            results = "Merged node %d into %d resulting in " % (kwargs['node_B'], kwargs['node_A'])
            # Get the relationships and hashkeys for both the A and B nodes
            r = self.client.command('''
                select hashkey, @class, key,
                In().key as InKeys, In().class_name as n_in_class, 
                Out().key as OutKeys, Out().class_name as n_out_class, OutE().@class, InE().@class 
                from V where key in [%d, %d]''' % (kwargs['node_A'], kwargs['node_B']))
            try:
                A = r[0].oRecordData
                if A["key"] == kwargs['node_B']:
                    B = A
            except:
                return "No record for %d" % kwargs['node_A']
            try:
                # Normal case
                if len(r) > 1:
                    B = r[1].oRecordData
                # B was created in the first
                elif A["key"] == kwargs['node_B']:
                    A = {"key": kwargs['node_A'], "hashkey": "", "class": B["class"],
                         'InKeys': [], 'n_in_class': [], 'OutKeys': [],
                         'n_out_class': [], 'OutE': [], 'InE': []}
            except:
                return "No record for %d" % kwargs['node_A']

            A['rels'] = []
            B['rels'] = []
            # Format A and B so relations can easily be compared through dictionaries within lists. Use a dir for direction
            for n in [A, B]:
                if (len(n['OutKeys']) == len(n['OutE'])) and len(n['OutKeys']) > 0:
                    for k, l, c in zip(n['OutKeys'], n['OutE'], n['n_out_class']):
                        n['rels'].append({
                            "edgeNode": k,
                            "edgeType": l,
                            "dir": "out",
                            "class": c
                        })
                # change of the from since it's an incoming edge
                if (len(n['InKeys']) == len(n['InE'])) and len(n['InKeys']) > 0:
                    for k, l, c in zip(n['InKeys'], n['InE'], n['n_in_class']):
                        n['rels'].append({
                            "edgeNode": k,
                            "edgeType": l,
                            "dir": "in",
                            "class": c
                        })

            # Check all the relationships for B and if it is not in A's relationships, create the rel using the dir
            i = 0
            for rel in B['rels']:
                if rel not in A['rels']:
                    i+=1
                    if rel['dir'] == "out":
                        self.create_edge(fromClass=A['class'], fromNode=A['key'], toClass=rel['class'],
                                         toNode=rel['edgeNode'], edgeType=rel['edgeType'])
                    else:
                        self.create_edge(fromClass=rel['class'], fromNode=rel['edgeNode'], toClass=A['class'],
                                         toNode=A['key'], edgeType=rel['edgeType'])
            results+= "%d new relations." % i

            # Update the hashkey of the A node for future indexing
            newHashKey = A['hashkey'] + "," + B['hashkey']
            self.update(key=A['key'], var="hashkey", val=newHashKey, class_name=A['class'])

            # Delete the B node
            self.delete_node(key=B['key'], class_name=B['class'])

        else:
            results = "Need both an A node and B node."
        return results

    def key_comparison(self, keys):
        """
        Using the keys from a node, check the Databases models for the one with the most similar keys to
        determine the class_name. For each model, use the list of keys to compare against the input keys. Each time
        there is a matching key, increase the similarity score
        :param keys:
        :return:
        """
        simScores = {}
        c_keys = []
        for k in keys:
            c_keys.append(str(k).lower())
        click.echo('[%s_%s] Running similarity on attributes:\n\t%s' % (get_datetime(), "home.key_comparison", keys))
        for m in self.models:
            simScores[m] = 0
            m_keys = []
            for k in list(self.models[m].keys()):
                m_keys.append(str(k).lower())
            for k in c_keys:
                if k in m_keys:
                    simScores[m]+=1

            #click.echo('[%s_%s] Compared %s\nScore: %s' % (get_datetime(), "home.key_comparison", m_keys, simScores[m]))
        class_name = max(simScores, key=simScores.get)
        click.echo('[%s_%s] Most likely class is %s with score %d.' % (
            get_datetime(), "home.key_comparison", class_name, simScores[max(simScores)]))

        return class_name

    def search(self, class_name="V", characters=""):
        """
        Use the LUCENE text index to find entities based on their description which has been set up for many classes
        :param class_name:
        :param characters:
        :return:
        """
        r = self.client.command('''
        select from *s where decription LUCENE "%s" LIMIT 5
        ''' % (class_name, characters))
        search_items = []
        for o in r:
            o = o.oRecordData
            search_items.append(self.format_node(**o))

        return search_items

    def load_graph(self, graph_key):
        """
        Get a graph which is based on a saved Case and it's neighbors and those neighbors relations to each other
        For each node in the case, get neighbors. Filter out any neighbor not in the case nodes
        :param graph_key:
        :return:
        """
        graph = self.get_neighbors_index(graph_key)
        case_graph = {"nodes": [], "lines": graph["data"]["lines"], "index": []}
        for n in graph["data"]["nodes"]:
            case_graph["nodes"].append(n)
            case_graph["index"].append(n["key"])
        for n in graph["data"]["lines"]:
            case_graph["index"].append("%s%s" % (n["to"], n["from"]))
        # Get the relationships of each case node that relates to another case node
        for n in graph["data"]["nodes"]:
            s_graph = self.get_neighbors_index(n["key"])
            for l in s_graph["data"]["lines"]:
                if l["to"] == n["key"]:
                    if l["from"] in case_graph["index"]:
                        if "%s%s" % (l["to"], l["from"]) not in case_graph["index"]:
                            case_graph["lines"].append(l)
                            case_graph["index"].append("%s%s" % (l["to"], l["from"]))
                if l["from"] == n["key"]:
                    if l["to"] in case_graph["index"]:
                        if "%s%s" % (l["to"], l["from"]) not in case_graph["index"]:
                            case_graph["lines"].append(l)
                            case_graph["index"].append("%s%s" % (l["to"], l["from"]))

        return case_graph

    def save(self, **kwargs):
        """
        Expects a request with graphCase containing the graph from the user's canvas and assumes that all nodes have an
        attribute "key". The creation of a node is only if the node is new and taken from a source that doesn't exist in
        POLE yet.
        If it is an existing case, set the LastUpdate to the current date time.
        QUERY 1 Checks if the Case already exists and if not, creates it.
        QUERY 2 Gets existing keys if the Nodes sent in the graphCase are already "Attached" to the Case from QUERY 1
        QUERY 3 Compares edges between the new case and old case and only adds a new relation where one doesn't exist
        Run a match query that returns only those nodes in the case and their relationships. The query uses the book-end
        method in a manner: Case-Attached->Vertex1-(any)->Vertex2-Attached->Case. Return v1, v2 and the type of relation
        TODO: Relation duplication quality - Include all edge attributes beyond description
        TODO: Implement classification on related nodes

        Owner/Member relations are maintained by storing the unique UserName of the user in the Case.Owners/Members
        string. The string is split into a list to compare with the incoming keys. If there is a gap, the string is
        updated. When the user logs in from the User Database side, it can call each other database to find out which
        cases the user belongs to and return those in an object.
        :param kwargs: graphCase, graphName, Classification, Owners, Members, CreatedBy
        :return: graph (in the UI form), message (summary of actions)
        """
        # The graph being saved
        fGraph = kwargs['graphCase']
        click.echo(fGraph)
        if "groups" in fGraph.keys():
            groups = fGraph['groups']
        else:
            groups = []
        # The new graph to be returned which includes nodes from fGraph with new keys if they are not stored yet
        graph = {
            "nodes": [],
            "lines": [],
            "groups": groups
        }
        # QUERY 1: Get the case by Name and Classification in the case there is no case key
        sql = ('''
            select * from Case where Name = '%s'
        ''' % (clean(kwargs['graphName']))
               )
        click.echo('[%s_%s] Q1: Getting Case:\n\t%s' % (get_datetime(), "home.save", sql))
        case = self.client.command(sql)
        # Array for the node keys related to the case if it exists returned from Query 2
        current_nodes = []
        # UPDATE CASE if it was found
        ownersString = str(kwargs['Owners']).strip('[]').replace("'", "")
        membersString = str(kwargs['Members']).strip('[]').replace("'", "")
        if len(case) > 0:
            # Settings for the update
            updateCaseWorkers = False
            casedata = dict(case[0].oRecordData)
            if "key" in casedata.keys():
                pass
            else:
                casedata["key"] = case[0]._rid

            # CHECK users to see if there are new ones to be added
            for user in kwargs['Owners']:
                if user not in casedata['Owners'].split(","):
                    ownersString+=",%s" % user
                    updateCaseWorkers = True
            if updateCaseWorkers:
                print("update attribute")
            for user in kwargs['Members']:
                if user not in casedata['Members'].split(","):
                    membersString+=",%s" % user
                    updateCaseWorkers = True
            if updateCaseWorkers:
                print("update attribute")

            # Store the other variables for the return value
            case = dict(key=casedata['key'], icon=self.ICON_CASE, status="CustomCase", title=casedata['Name'])
            # UPDATE the LastUpdate attribute and carry the variable over to the return value
            LastUpdate = get_datetime()
            self.update(class_name="Case", var="LastUpdate", val=LastUpdate, key=case['key'])
            case['attributes'] = [
                {"label": "Owners", "value": casedata['Owners']},
                {"label": "Members", "value": casedata['Members']},
                {"label": "Classification", "value": casedata['Classification']},
                {"label": "StartDate", "value": casedata['StartDate']},
                {"label": "LastUpdate", "value": LastUpdate},
                {"label": "className", "value": "Case"},
                {"label": "CreatedBy", "value": casedata['CreatedBy']},
                {"label": "Description", "value": casedata['description']}
            ]
            # Carry the case_key over to the relationship creation
            case_key = str(case['key'])
            message = "Updated %s" % case['title']
            # QUERY 2: Get the node keys related to the case that was found T
            sql = '''
            select OUT() from %s
            ''' % case_key
            click.echo('[%s_%s] Q2: Getting Case nodes:\n\t%s' % (get_datetime(), "home.save", sql))
            Attached = self.client.command(sql)
            for k in Attached[0].oRecordData['OUT']:
                current_nodes.append(k.get_hash())
        # SAVE CASE if it was not found
        else:
            try:
                fGraph = json.loads(fGraph["graphCase"])
            except:
                fGraph = json.dumps(fGraph)
            message = "Saved %s" % kwargs['graphName']
            case = self.create_node(
                class_name="Case",
                Name=clean(kwargs["graphName"]),
                CreatedBy=clean(kwargs["CreatedBy"]),
                Owners=ownersString,
                Members=membersString,
                description="Case %s" % clean(kwargs["graphName"]),
                Classification=kwargs["Classification"],
                StartDate=get_datetime(),
                LastUpdate=get_datetime(),
                NodeCount=len(fGraph['nodes']),
                EdgeCount=len(fGraph['lines'])
            )['data']
            case_key = str(case['key'])
            # Relate the members to the case
            Members = membersString.split(",")
            for m in Members:
                r = self.client.command("select @rid from User where userName = '%s'" % m)
                if len(r) == 0:
                    user = self.create_node(class_name="User", userName=m)['data']['key']
                else:
                    user = r[0].oRecordData['rid']
                self.create_edge_new(toNode=case_key, fromNode=user, edgeType="MemberOf")
            # Relate the createdBy
            r = self.client.command("select @rid from User where userName = '%s'" % kwargs["CreatedBy"])
            if len(r) == 0:
                user = self.create_node(class_name="User", userName=kwargs["CreatedBy"])['data']['key']
            else:
                user = r[0].oRecordData['rid']
            self.create_edge_new(toNode=case_key, fromNode=user, edgeType="CreatedBy")
            click.echo('[%s_%s_create_db] Created Case:\n\t%s' % (get_datetime(), "home.save", case))

        # Attach the Case record to the nodes
        graph['nodes'].append(case)
        # ATTACHMENTS of Nodes and Edges from the Request.
        newNodes = newLines = 0
        if "nodes" in fGraph.keys() and "lines" in fGraph.keys():
            for n in fGraph['nodes']:
                # If the new Case node is not in the keys from the collection create a node
                if "key" in n.keys():
                    pass
                elif "id" in n.keys():
                    n["key"] = n["id"]
                else:
                    print(n)
                if n['key'] not in current_nodes:
                    newNodes += 1
                    # To add the Node with a new key, need to pop this node's key out and then replace in the lines
                    oldKey = n['key']
                    try:
                        n['class_name'] = self.get_node_att(n, 'className')
                    except:
                        n['class_name'] = self.get_node_att(n, 'class_name')
                    # Get the class_name required for creating a node. Cases where the entityType is used replaces class_name
                    if not n['class_name'] and not n['entityType']:
                        keys_to_compare = []
                        for k in n.keys():
                            keys_to_compare.append(k)
                        if 'attributes' in n.keys():
                            for a in n['attributes']:
                                keys_to_compare.append(a['label'])
                        n['class_name'] = self.key_comparison(keys_to_compare)
                    elif 'entityType' in n.keys():
                        n['class_name'] = n['entityType']
                    # Save the class name for use in the relationship since it is otherwise buried in the attributes
                    class_name = n['class_name']
                    n.pop("key")
                    n = self.create_node(**n)
                    n_key = str(n['data']['key'])
                    # Go through the lines and change the key to this new key
                    for l in fGraph['lines']:
                        if 'to' in l.keys():
                            pass
                        elif 'target' in l.keys():
                            l['to'] = l['target']
                        if l['to'] == oldKey:
                            l['to'] = n_key
                        if 'from' in l.keys():
                            pass
                        elif 'source' in l.keys():
                            l['from'] = l['source']
                        if l['from'] == oldKey:
                            l['from'] = n_key
                    if {"from": case_key, "to": n_key, "description": "Attached"} not in graph['lines']:
                        self.create_edge_new(fromNode=case_key, toNode=n['data']['key'], edgeType="Attached")
                        graph['lines'].append({"from": case_key, "to": n_key, "description": "Attached"})

                    # Add the node to the graph
                    graph['nodes'].append(n['data'])
                # Otherwise just add it as is to the new graph that will be sent back
                else:
                    graph['lines'].append({"from": str(case_key), "to": str(n['key']), "description": "Attached"})
                    graph['nodes'].append(n)

            # QUERY 3: Compare the edges between nodes from the saved case and the new case
            # to determine if new edge is needed
            oldRels = graph['lines']
            sql = ('''
            match
            {class:Case, as:c, where: (@rid = %s)}.out("Attached")
            {class:V, as:v1}.outE(){as:v2e}.inV()
            {class:V, as:v2}.in("Attached")
            {class:Case, where: (@rid = %s)}
            return v1.@rid as from_key, v2.@rid as to_key, v2e.@class as description
            ''' % (case_key, case_key))
            rels = self.client.command(sql)
            # Compare the rels that are currently stored with the ones in that were added during Case creation step 1
            click.echo('[%s_%s] Q3: Compare existing case to new:\n\t%s' % (get_datetime(), "home.save", sql))
            for rel in rels:
                rel = rel.oRecordData
                oldRels.append({"from": rel['from_key'].get_hash(), "to": rel['to_key'].get_hash(), "description": rel['description']})
            for l in graph['lines']:
                if {"from": l['from'], "to": l['to'], "description": l['description']} not in oldRels:
                    newLines += 1
                    self.create_edge_new(fromNode=l['from'], toNode=l['to'], edgeType=l['description'])
            # Final Comparison of relations using the fGraph where keys of new nodes are changed
            for r in fGraph['lines']:
                if 'description' in r.keys():
                    pass
                else:
                    r['description'] = "Related"
                if {"from": r['from'], "to": r['to'], "description": r['description']} not in graph['lines']:
                    graph['lines'].append({"from": r['from'], "to": r['to'], "description": r['description']})
                    try:
                        self.create_edge_new(fromNode=r['from'], toNode=r['to'], edgeType=r['description'])
                    except Exception as e:
                        click.echo('[%s_%s] %s' % (get_datetime(), "home_save", str(e)))

            if newNodes == 0 and newLines == 0:
                message = "No new data received. Case %s is up to date." % clean(kwargs["graphName"])
            else:
                message = "%s with %d nodes and %d edges." % (message, newNodes, newLines)
        click.echo('[%s_%s] %s' % (get_datetime(), "home_save", message))
        return graph, message

    @staticmethod
    def get_class_name(graph, key):
        """
        Needed for the SAPUI5 graph because relations/lines do not have class_names and this is needed to create an edge
        :param graph:
        :param key:
        :return:
        """
        for n in graph['nodes']:
            try:
                if str(n['key']) == str(key):
                    if 'class_name' in n.keys():
                        return n['class_name']
                    elif 'attributes' in n.keys():
                        for a in n['attributes']:
                            if a['label'] == 'class_name' or a['label'] == 'className':
                                return a['value']
            except Exception as e:
                click.echo("ERROR in get_class_name: %s" % str(e) )
        return

    @staticmethod
    def get_node_att(node, att):

        try:
            for a in node['attributes']:
                if a['label'] == att:
                    return a['value']
            return None
        except:
            print(node)

    def create_text_indexes(self):
        '''
        Create text indexes on the model entities with description attributes
        '''
        click.echo('[%s_home_server_create_text_indexes] Creating indexes' % (get_datetime()))
        for m in self.models:
            for k in self.models[m].keys():
                if str(k) == "description":
                    sql = '''
                    CREATE INDEX %s.search_fulltext ON %s(description) FULLTEXT ENGINE LUCENE METADATA
                              {
                                "default": "org.apache.lucene.analysis.standard.StandardAnalyzer",
                                "index": "org.apache.lucene.analysis.en.EnglishAnalyzer",
                                "query": "org.apache.lucene.analysis.standard.StandardAnalyzer",
                                "analyzer": "org.apache.lucene.analysis.en.EnglishAnalyzer",
                                "allowLeadingWildcard": true
                              }
                    ''' % (m, m)
                    self.client.command(sql)
        click.echo('[%s_home_server_create_text_indexes] Indexes complete' % (get_datetime()))
