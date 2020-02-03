import React, {Component} from 'react';
import './App.css';
import Drawer from './containers/Drawer'
import GraphWorkBench from './containers/GraphWorkBench'
import Snackbar from './components/SnackBar'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core';
import amber from '@material-ui/core/colors/amber';
import grey from '@material-ui/core/colors/grey';
import Iframe from 'react-iframe';
import Chart from './components/Chart';
import Sankey from './components/Sankey';
import LoginDialog from './components/Login'

const theme = createMuiTheme({
  palette: {
      primary: grey,
      secondary: amber,
      type: 'dark'
  },
  status: {
      danger: 'orange',

  }
});

class App extends Component {
  constructor(props){
    super(props);
    this.state = {
      apiUrl: "http://40.71.1.6:8000/",
      currentUser: null,
      currentWidget: null,
      appHeadline: "",
      snackBarOpen: false,
      snackBarMessage: "Latest message",
      users: [],
      graphs: [],
      token: null,
      sessionId: null,
      loginFormState: false,
      osintModel: null, // Keep a single place for the models which is in the apiserver folder containing also User and POLE model. However only OSINT model is needed here
      widgets: [
      ],
      details: ["One"],
      graph: null
    };
    this.userLogin = this.userLogin.bind(this);
    this.userLogout = this.userLogout.bind(this);
    this.toggleMessage = this.toggleMessage.bind(this);
    this.setWidget = this.setWidget.bind(this);
    this.toggleMainContent = this.toggleMainContent.bind(this);
    this.userRegister = this.userRegister.bind(this);
    this.closeLogin = this.closeLogin.bind(this);
    this.closeSnackBar = this.closeSnackBar.bind(this);
  }

  closeLogin = () => {
    this.setState({loginFormState: false});
  }

  userRegister = (userData) => {
    /*
      If a user does not exist, encrypt the password for storage and create the user
      Send an email to the user email provided for confirmation process
    */
    this.setState({loginFormState: false});
    let userForm = new FormData();
    userForm.append('userName', userData.userName);
    userForm.append('passWord', userData.userPassword);
    userForm.append('email', userData.userEmail);
    const settings = {
      method: 'POST',
      body: userForm,
      mode: 'cors',
      redirect: 'follow'
    };
    fetch(this.state.apiUrl + 'users/create', settings)
    .then((response)=> {
      return response.json();
    })
    .then((result) => {
      this.setState({snackBarMessage: result.message});
      this.setState({snackBarOpen: true});
      console.log(result.message);
    })
    .catch(error => {
      console.log(error.response);
    });
  }

  userLogin = (userData) => {
    // If the login state is false/closed, set it to open so the user can fill the form
    if(this.state.loginFormState === false){
      this.setState({loginFormState: true});
    // The login state is open and the button pressed is intended to login
    } else {
      this.setState({loginFormState: false});
      let userForm = new FormData();
      userForm.append('userName', userData.userName);
      userForm.append('passWord', userData.userPassword);
      const settings = {
        method: 'POST',
        body: userForm,
        mode: 'cors'
      };
      fetch(this.state.apiUrl + '/users/login', settings)
      .then((response)=> {
        return response.json();
      })
      .then((result) => {
        console.log(result.message);
        this.setState({users : result.users});
        this.setState({graphs: result.graphs});
        this.setState({osintModel: result.models});
        this.setState({graph: result.graphs[0].data});
        this.setState({token: result.token});
        this.setState({sessionId: result.sessionId});
        this.setState({currentUser : userData.userName});
        this.setState({appHeadline: "Welcome to tsX " + userData.userName});
        this.setState({widgets: 
          [
            {
              sKey: 0,
              title: "Threat Watch",
              subtitle: "Monitoring of streaming data",
              status: "statusAmber",
              content: [
    
              ]
            },
            {
              sKey: 1,
              title: "Alerts",
              subtitle: "Incidents under investigation",
              status: "statusRed",
              content: [
                {title: "High Alerts", count: 2, status: "secondary", click: this.toggleMessage}
              ]
            },
            {
              sKey: 2,
              title: "Change Requests",
              subtitle: "Internal processes",
              status: "statusGreen",
              content: [
                {title: "High Priority", count: 4, status: "primary", click: this.toggleMessage}
              ]
            },
            {
              sKey: 3,
              title: "Next CCB",
              subtitle: "Briefing preparation plaform",
              status: "statusGreen",
              content: null
            },
            {
              sKey: 4,
              title: "Systems Breakdown",
              subtitle: "Organizational analysis of critical devices",
              content: [
                {title: "Systems", count: 3, status: "secondary", click: this.toggleMessage}
              ]
            },
            {
              sKey: 5,
              title: "Generate Reports",
              subtitle: "Data science workbench and analytics with OrientDB",
              content: [
                <GraphWorkBench
                  graph={this.state.graph}
                  graphs={this.state.graphs}
                  currentUser={this.state.currentUser}
                  users={this.state.users}
                  osintModel={this.state.osintModel}
                />
              ]
            },
            {
              sKey: 6,
              title: "Import Data",
              subtitle: "Collection and pipeline orchestration with Apache NiFi",
              iframeURL: (
                <Iframe url="http://10.0.0.4:2/studio/index.html"
                    width="100%"
                    height="700px"
                    id="myId"
                    className="myClassname"
                    display="initial"
                    position="relative"/>
              ),
              content: null
            },
            {
              sKey: 7,
              title: "Export Data",
              subtitle: "Formatting and version control",
              content: null
            },
            {
              sKey: 8,
              title: "Vulnerabilities",
              subtitle: "System warnings and leads",
              status: "statusAmber",
              content: null,
              reports: ([
                  <Chart/>,
                  <Sankey/>
              ])
            }
          ]
        });
        this.setState({snackBarOpen : true});
        this.setState({snackBarMessage : "Successfully logged in"});
      })
      .catch(error => {
        console.log(error.response);
      });

    }
  }

  userLogout = () => {
    let userForm = new FormData();
    userForm.append("userName", this.state.currentUser);
    let formHeaders = new Headers();
    formHeaders.append("Authorization", this.state.token);
    formHeaders.append("SessionId", this.state.sessionId);
    formHeaders.append("Content-Type", "application/x-www-form-urlencoded");
    const settings = {
      method: 'POST',
      body: userForm,
      headers: formHeaders,
      mode: 'cors',
      redirect: 'follow'
    };
    fetch(this.state.apiUrl + 'users/logout', settings)
    .then((response)=> {
      return response.json();
    })
    .then((result) => {
      console.log(result.message);
      this.setState({users : null});
      this.setState({graph: null});
      this.setState({token: null});
      this.setState({currentUser : null});
      this.setState({appHeadline: ""});
      this.setState({widgets: []});
      this.setState({snackBarOpen : true});
      this.setState({snackBarMessage : "Successfully logged out"});
    })
    .catch(error => {
      console.log(error.response);
    });
  }

  toggleMainContent = () => {
    this.setState({currentWidget : null});
  }

  toggleMessage = () => {
    this.setState({snackBarOpen: !this.state.snackBarOpen})
  }

  closeSnackBar = () => {
    this.setState({snackBarOpen: false})
  }

  setWidget = (widget) => {
    this.setState({
      currentWidget : this.state.widgets[widget]
    })
  }

  render(){
    

    return (
      <MuiThemeProvider theme={theme}>
        <div className="App">
          <div id="mapid"></div>
          <div className="appLayer">
            <Drawer
              currentUser={this.state.currentUser}
              userLogin={this.userLogin}
              userLogout={this.userLogout}
              appHeadline={this.state.appHeadline}
              widgets={this.state.widgets}
              details={this.state.details}
              currentWidget={this.state.currentWidget}
              setWidget={this.setWidget}
              toggleMainContent={this.toggleMainContent}
              graph={this.state.graph}
            />
            <LoginDialog
              open={this.state.loginFormState}
              login={this.userLogin}
              close={this.closeLogin}
              register={this.userRegister}
            />
            <Snackbar
              close={this.closeSnackBar}
              open={this.state.snackBarOpen}
              message={this.state.snackBarMessage}
            />
          </div>
        </div>
      </MuiThemeProvider>
    );
  }
}

export default App;
