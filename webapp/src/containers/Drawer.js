import React from 'react';
import clsx from 'clsx';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import List from '@material-ui/core/List';
import CssBaseline from '@material-ui/core/CssBaseline';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import LoginIcon from '@material-ui/icons/Fingerprint';
import Widgets from './Widgets';
import Detail from '../components/Detail';
import Avatar from '@material-ui/core/Avatar';
import HomeIcon from '@material-ui/icons/Home';
import ThreatWatchIcon from '@material-ui/icons/Visibility';
import AlertsIcon from '@material-ui/icons/Feedback';
import ChangeRequestsIcon from '@material-ui/icons/RecordVoiceOver';
import NextCCBIcon from '@material-ui/icons/NextWeek';
import SystemsBreakdownIcon from '@material-ui/icons/DeviceHub';
import GenerateReportsIcon from '@material-ui/icons/Dashboard';
import ImportDataIcon from '@material-ui/icons/CloudUpload';
import ExportDataIcon from '@material-ui/icons/CloudDownload';
import VulnerabilitiesIcon from '@material-ui/icons/BugReport';

const drawerWidth = 240;

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  menuButton: {
    marginRight: 36,
  },
  hide: {
    display: 'none',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  drawerOpen: {
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerClose: {
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'hidden',
    width: theme.spacing(7) + 1,
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing(9) + 1,
    },
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing(0, 1),
    ...theme.mixins.toolbar,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  webmap: {
    height: 400
  }
}));

export default function MiniDrawer(props) {
    const classes = useStyles();
    const theme = useTheme();
    const [open, setOpen] = React.useState(false);
    
    const setDetail = (event) => {
      props.setWidget(Number(event.currentTarget.value));
    };

    const handleDrawerOpen = () => {
        setOpen(true);
    };

    const handleDrawerClose = () => {
        setOpen(false);
    };

    let MenuItems = props.widgets;
    let TopMenuItems = [];
    if (props.currentUser){
        //User
        TopMenuItems = [
            {text: 'Logout', icon: <LoginIcon onClick={props.userLogout}/>},
            {text: 'Home', icon: <HomeIcon onClick={props.toggleMainContent}/>}
        ];
        MenuItems = [
            {text: 'Threat Watch', icon: <ThreatWatchIcon onClick={() => props.setWidget(0)}/>},
            {text: 'Alerts', icon: <AlertsIcon onClick={() => props.setWidget(1)}/>},
            {text: 'Change Requests', icon: <ChangeRequestsIcon onClick={() => props.setWidget(2)}/>},
            {text: 'Next CCB', icon: <NextCCBIcon onClick={() => props.setWidget(3)}/>},
            {text: 'Systems Breakdown', icon: <SystemsBreakdownIcon onClick={() => props.setWidget(4)}/>},
            {text: 'Generate Reports', icon: <GenerateReportsIcon onClick={() => props.setWidget(5)}/>},
            {text: 'Import Data', icon: <ImportDataIcon onClick={() => props.setWidget(6)}/>},
            {text: 'Export Data', icon: <ExportDataIcon onClick={() => props.setWidget(7)}/>},
            {text: 'Vulnerabilities', icon: <VulnerabilitiesIcon onClick={() => props.setWidget(8)}/>},

        ];
    } else {
        //No user
        TopMenuItems = [
            {text: 'Login', icon: <LoginIcon onClick={props.userLogin}/>}
        ];
    }

    let mainContent = null;
    if (props.currentWidget){
      mainContent = (
        <div>
          <Detail
            navBack={props.toggleMainContent}
            widget={props.currentWidget}
          />
        </div>
        );
    } else {
      mainContent = (
        <div>
        <Widgets
          widgets={props.widgets}
          openDetail={setDetail}
          />
          </div>
        )
    }

    let tsImage = (
      <Avatar 
        alt="tsX"
        src={require('../assets/images/ts_logo_tsx.png')}
      />
    );

    return (
        <div className={classes.root}>
        <CssBaseline />
        <AppBar
            position="fixed"
            className={clsx(classes.appBar, {
            [classes.appBarShift]: open,
            })}>
            <Toolbar>
            <IconButton
                color="inherit"
                aria-label="open drawer"
                onClick={handleDrawerOpen}
                edge="start"
                className={clsx(classes.menuButton, {
                [classes.hide]: open,
                })}
            >
                <MenuIcon />
            </IconButton>
            {tsImage}
            
            <Typography variant="h6" noWrap className={classes.content}>
                {props.appHeadline}
            </Typography>
            </Toolbar>
        </AppBar>
        <Drawer
            variant="permanent"
            className={clsx(classes.drawer, {
            [classes.drawerOpen]: open,
            [classes.drawerClose]: !open,
            })}
            classes={{
            paper: clsx({
                [classes.drawerOpen]: open,
                [classes.drawerClose]: !open,
            }),
            }}
            open={open}
        >
            <div className={classes.toolbar}>
            <IconButton onClick={handleDrawerClose}>
                {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
            </div>
            <Divider />
            <List>
            {TopMenuItems.map((menuItem) => (
                <ListItem button key={menuItem.text} value={menuItem.key}>
                <ListItemIcon>{menuItem.icon}</ListItemIcon>
                <ListItemText primary={menuItem.text} />
                </ListItem>
            ))}
            </List>
            <Divider />
            <List>
            {MenuItems.map((menuItem) => (
                <ListItem button key={menuItem.text}>
                <ListItemIcon>{menuItem.icon}</ListItemIcon>
                <ListItemText primary={menuItem.text} />
                </ListItem>
            ))}
            </List>
        </Drawer>
        <main className={classes.content}>
            <div className={classes.toolbar} />
              {mainContent}
        </main>
        </div>
    );
}