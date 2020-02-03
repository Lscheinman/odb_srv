import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { green, blue, orange, amber, red } from '@material-ui/core/colors';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import LaunchIcon from '@material-ui/icons/Launch';
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
import Container from '@material-ui/core/Container';
import Chip from '@material-ui/core/Chip';
import BackdropFilter from "react-backdrop-filter";

const useStyles = makeStyles({
  card: {
    width: 345,
  },
  media: {
    height: 140,
  },
  chipAlert: {
    margin: 1,
  },
  avatar: {
    margin: 10,
  },
  statusGreen: {
    margin: 10,
    color: '#fff',
    backgroundColor: green[500]
  },
  statusAmber: {
    margin: 10,
    color: '#fff',
    backgroundColor: amber[500]
  },
  statusBlue: {
    margin: 10,
    color: '#fff',
    backgroundColor: blue[500]
  },
  statusOrange: {
    margin: 10,
    color: '#fff',
    backgroundColor: orange[500]
  },
  statusRed: {
    margin: 10,
    color: '#fff',
    backgroundColor: red[500]
  },

});

export default function MediaCard(props) {
  const classes = useStyles();
  //TODO SET THE Props of the card so they can be passed back up as keys instead of using the text way

  const getDetail = (event) => {
    props.openDetail(event);
  };

  const handleClick = () => {
    alert('You clicked the Chip.');
  };

  let icon = <HomeIcon/>;
  let status = classes.statusBlue;
  let contentDiv = null;

  if(props.title === "Threat Watch"){ icon = <ThreatWatchIcon/>;}
  if(props.title === "Alerts"){ icon = <AlertsIcon/>;}
  if(props.title === "Change Requests"){ icon = <ChangeRequestsIcon/>;}
  if(props.title === "Next CCB"){ icon = <NextCCBIcon/>;}
  if(props.title === "Systems Breakdown"){ icon = <SystemsBreakdownIcon/>;}
  if(props.title === "Generate Reports"){ icon = <GenerateReportsIcon/>;}
  if(props.title === "Import Data"){ icon = <ImportDataIcon/>;}
  if(props.title === "Export Data"){ icon = <ExportDataIcon/>;}
  if(props.title === "Vulnerabilities"){ icon = <VulnerabilitiesIcon/>;}
  if(props.status === "statusRed"){ status = classes.statusRed;}
  if(props.status === "statusAmber"){ status = classes.statusAmber;}
  if(props.status === "statusBlue"){ status = classes.statusBlue;}
  if(props.status === "statusOrange"){ status = classes.statusOrange;}
  if(props.status === "statusGreen"){ status = classes.statusGreen;}
  let report = null;
  if(props.reports){
    report = props.reports[0];
  }
  if(props.content){
    let content = [];
    for(var c in props.content){
      content.push(
        <Chip
          key={c}
          className={classes.chipAlert}
          avatar={<Avatar>{props.content[c].count}</Avatar>}
          label={props.content[c].title}
          color={props.content[c].status}
          clickable={true}
          onClick={props.content[c].click}
        />
      )
    }
    contentDiv = (
        <Container>
          {content}
          {report}
        </Container>
      );
  }

  return (
    <BackdropFilter
      className="bluredForm"
      filter={"blur(10px) sepia(50%)"}
      canvasFallback={true}
      html2canvasOpts={{
          allowTaint: true
      }}
      onDraw={() => {
          console.log("Rendered !");
      }}
    >
      <Card className={classes.card}>
        <CardHeader
          title={props.title}
          subheader={props.subtitle}
          avatar={
            <Avatar className={status}>
              {icon}
            </Avatar>
          }
        />
        <CardActionArea>
          <CardContent>
            {contentDiv}
          </CardContent>
        </CardActionArea>
        <CardActions>
          <Button size="small" color="primary" value={props.sKey} onClick={getDetail}>
            <LaunchIcon/>
          </Button>
        </CardActions>
      </Card>
    </BackdropFilter>
  );
}