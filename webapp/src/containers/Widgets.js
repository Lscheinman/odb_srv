import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Card from '../components/Card'

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    overflow: 'hidden',
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
}));

export default function AutoGrid(props) {
  const classes = useStyles();

  let TopMenuItems = props.widgets;


  return (
    <div className={classes.root}>
      <Grid container spacing={1}>
            {TopMenuItems.map((widget) => (
                <Grid item xs key={widget.title}>
                    <Card
                        sKey={widget.sKey}
                        image={widget.image}
                        title={widget.title}
                        subtitle={widget.subtitle}
                        status={widget.status}
                        text={widget.text}
                        content={widget.content}
                        reports={widget.reports}
                        openDetail={props.openDetail}
                    />
                </Grid>
            ))}
      </Grid>
    </div>
  );
}