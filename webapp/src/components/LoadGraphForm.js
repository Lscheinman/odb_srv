/**
A Popover with select list that will show the “Cases” or sub graphs associated with a User
by the relationship, CreatedBy, Owner, or Member. When a user logs in, the database returns
all “Cases” in which the user has one of those 3 relationships. The user can then select
one of the graphs to load into the workspace.
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
  const [selectValue, setSelectValue] = React.useState("");
  const [graphModel, setSelectedGraph] = React.useState([]);

  const handleGraphNameSelect= event => {
    // Set the graphModel so it can be filled in by the GraphWorkBench call to the server
    setSelectValue(event.target.value);
    setSelectedGraph(props.graphs.filter(graph => graph.key === event.target.value));
  };

  const handleLoadGraph = () => {
    props.loadGraph(graphModel[0]);
  };

  let available = null;
  if(props.graphs === []){
    available = [];
  } else {
    available = props.graphs.map(option => (
      <MenuItem
        key={option.key}
        value={option.key}
        >{option.Name}</MenuItem>
    ));
  }

  return (
    <div>
        <form className={classes.root} autoComplete="off">
            <Grid container>
                <Grid item xs={12}>
                    <FormControl className={classes.formControl}>
                      <InputLabel>Graphs</InputLabel>
                      <Select 
                        value={selectValue}
                        onChange={handleGraphNameSelect}>
                        {available}
                      </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    className={classes.button}
                    onClick={handleLoadGraph}>
                    Load
                  </Button>
                </Grid>
            </Grid>
        </form>
    </div>
  );
}