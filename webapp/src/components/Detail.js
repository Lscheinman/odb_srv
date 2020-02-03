import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';


const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(3, 2),
  }
}));

export default function PaperSheet(props) {
  const classes = useStyles();
  let iFrame = null;
  let Reports = null;
  let Content = null;
  if(props.widget.iframeURL){
    iFrame = props.widget.iframeURL;
  }
  if(props.widget.reports){
    Reports = props.widget.reports;
  }
  if(props.widget.title === "Generate Reports"){
    Content = props.widget.content[0];
  } else {
    Content = (
      <Paper className={classes.root}>
        <Typography variant="h5" component="h3">
          {props.widget.title}
        </Typography>
        <Typography component="p">
        {props.widget.subtitle}
        </Typography>
      </Paper>
    );
  }
  return (
    <div>
      {Content}
      {Reports}
      {iFrame}
    </div>
  );
}