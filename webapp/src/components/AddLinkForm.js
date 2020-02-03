/*
The component is contained in a Popover with state determined by the GraphWorkBench. It 
contains two select fields and a button to create an edge/link/line/relationship between 2
nodes that exist in the graph data. This means when there are thousands of nodes, there 
will be thousands of choices and therefore a more optimal method such as drawing a line 
between two entities on the canvas itself. However, for smaller data sets this method 
offers a quick ability to establish creating additional information.
 */

import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';

const useStyles = makeStyles(theme => ({
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
  button: {
    margin: theme.spacing(1),
  },
  root: {
    flexGrow: 1,
  },
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    width: 200,
  },
}));

export default function SimpleSelect(props) {
  const classes = useStyles();
  const [sourceEntity, setSelectedSource] = React.useState([]);
  const [targetEntity, setSelectedTarget] = React.useState([]);

  const handleChangeSource = event => {
    setSelectedSource(event.target.value);
  };

  const handleChangeTarget = event => {
    setSelectedTarget(event.target.value);
  };

  const handleAddLink = () => {
    props.addLink({source: sourceEntity, target: targetEntity});
  }

  let available = null;
  if(props.graph === null){
    available = [];
  } else {
    available = props.graph.nodes.map(option => (
      <MenuItem
        key={option.id}
        value={option.id}
        >{option.label}</MenuItem>
    ));
  }

  return (
    <div>
        <form className={classes.root} autoComplete="off">
            <Grid container>
                <Grid item xs={6}>
                    <FormControl className={classes.formControl}>
                        <InputLabel>Source</InputLabel>
                        <Select 
                            value={sourceEntity} 
                            onChange={handleChangeSource}>
                            {available}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={6}>
                    <FormControl className={classes.formControl}>
                        <InputLabel>Target</InputLabel>
                        <Select 
                            value={targetEntity} 
                            onChange={handleChangeTarget}>
                            {available}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12}>
                    <Button
                            variant="contained"
                            color="primary"
                            className={classes.button}
                            onClick={handleAddLink}>
                                Create
                    </Button>
                </Grid>
            </Grid>
        </form>
    </div>
  );
}