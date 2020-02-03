import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import { TextField } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
    alignContent: 'flex-start'
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
  button: {
    margin: theme.spacing(1),
  },
  grid: {
    alignContent: 'flex-start'
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
    const [classification, setClassification] = React.useState(["Unclassified"]);
    const [members, setMembers] = React.useState([]);
    const [graphName, setGraphName] = React.useState("Graph");

    const handleChangeMembers = event => {
        setMembers(event.target.value);
    };

    const handleChangeName= event => {
        setGraphName(event.target.value);
    };

    const handleChangeClassification = event => {
        setClassification(event.target.value);
    };

    const handleSaveGraph = () => {
        props.saveGraph({
            graphName: graphName,
            members: members,
            classification: classification
        });
    }

    let classifications = [
        {value: "Unclassified"},
        {value: "Confidential"},
        {value: "Secret"}
        ];

    return (
    <div>
        <form className={classes.root} autoComplete="off">
            <Grid container>
                <Grid item xs={6} className={classes.grid}>
                    <InputLabel className={classes.formControl}>Name</InputLabel>
                    <TextField 
                        className={classes.formControl} 
                        onChange={handleChangeName}/>
                </Grid>
                <Grid item xs={6} className={classes.grid}>
                    <InputLabel className={classes.formControl}>Classification</InputLabel>
                    <Select
                        className={classes.formControl} 
                        value={classification}
                        onChange={handleChangeClassification}>
                        {classifications.map(option => 
                            (<MenuItem 
                                key={option.value} 
                                value={option.value}>{option.value}</MenuItem>
                                )
                        )}
                    </Select>
                </Grid>
                <Grid item xs={6} className={classes.grid}>
                    <InputLabel className={classes.formControl}>Members</InputLabel>
                    <Select 
                        className={classes.formControl} 
                        multiple
                        value={members}
                        onChange={handleChangeMembers}>
                        {props.users.map(user => 
                            (<MenuItem 
                                key={user} 
                                value={user}>{user}</MenuItem>
                                )
                        )}
                    </Select>
                </Grid>
                <Grid item xs={6} className={classes.grid}>
                    <Button
                            variant="contained"
                            color="primary"
                            className={classes.button}
                            onClick={handleSaveGraph}>
                                Save
                    </Button>
                </Grid>
            </Grid>
        </form>
    </div>
  );
}