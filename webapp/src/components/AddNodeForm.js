/*
The component is contained in a Popover with state determined by the GraphWorkBench.
It contains a select option which determines the dynamic contents of the form based on the
entity type and it’s match to the OSINT model mirrored in the API service. The OSINT model
is provided to the application through the User login service and contains all the 
entities based on STIX2 and other open source intelligence sources. More can be added in a
single location at the API service apiserver.models.py file. Other models including USER 
are not passed since they contain administrative data. Other models can be added as they 
are encountered but it is suggested to create them as new entities within the OSINT model.
 */

import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
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
    margin: theme.spacing(1),
    width: 200,
  },
}));

export default function SimpleSelect(props) {
  const classes = useStyles();
  const [selectedModel, setSelectedModel] = React.useState(null);
  const [nodeForm, setNodeForm] = React.useState({});
  const noShows = [...props.noShows];
  
  const handleChange = event => {
    // Set the nodeForm with the 2 requirements not editable to the user.
    setNodeForm({
      entityType: event.currentTarget.textContent,
      icon: event.target.value
    })
    // Set the model that will be filled by the user and then sent to the GraphWorkBench to process
     //Map a lower and white-spaced removed event.currentTarget.textContent and map to the osintModel to get the attributes
    let selectedTypeKey = event.currentTarget.textContent.toLowerCase().replace(/\s/g,'');
    for(var m in props.osintModel){
      if(m.toLowerCase() === selectedTypeKey){
        setSelectedModel(props.osintModel[m]);
        setNodeForm({"class_name": m})
        break;
      }
    }
  };

  const handleUpdate = event => {
    // Updates to the form created by the change of entity from handleChange
    // Make a copy of the details so it can be reset to the new values
    let oDetails = {...nodeForm};
    // Set the detail attribute to the attribute value being changed in the form
    oDetails[event.target.id] = event.target.value;
    setNodeForm(oDetails);
  };

  const handleAddNode = () => {
    // Add the node dynamically based on the form content
    console.log("Add" + nodeForm);
    props.addNode(nodeForm);
  }

  /* Set the form content based on the selected entity type
    / Based on a grid row of length 12, make each entity selection half the width of the form 
    / Ensure the onChange for each type points to a factory setting that sets up the form needed to be sent to the GraphWorkBench
    / where the node will be created. 
  */
  // Set up an array to collect the attributes which will be in the form of grid items that contain either a text or datefield for input
  let gridItems = [];
  // Standard Form content with no class identified
  let formContent = (
    <div>
      <Grid item xs={6}>
        <TextField
            label="Description"
            className={classes.textField}
            onChange={handleUpdate}
            InputLabelProps={{
            shrink: true,
            }}
        />
      </Grid>
      <Grid item xs={6}>
        <TextField
            label="Datetime"
            type="datetime-local"
            className={classes.textField}
            onChange={handleUpdate}
            InputLabelProps={{
            shrink: true,
            }}
        />
      </Grid>
    </div>
  );
  // If there is a class that matches the selected model create a new formContent for that class
  if(selectedModel !== null){
    var i = 0;
    for(var k in selectedModel){
      i++;
      // Filter out the hashkey, icon, key, class_name and other un-needed values from the noShows which includes only lowercase versions of noshow attributes
      if(!noShows.includes(k.toLowerCase())){
        // If it is a datetime, make it a date field
        if(selectedModel[k] === "datetime"){
          gridItems.push(
            <Grid item xs={6}>
              <TextField
                key={i}
                id={k}
                label={k}
                type="datetime-local"
                className={classes.textField}
                onChange={handleUpdate}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          );
        } else {
          gridItems.push(
            <Grid item xs={6}>
              <TextField
                  key={i}
                  id={k}
                  label={k}
                  className={classes.textField}
                  onChange={handleUpdate}
                  InputLabelProps={{ shrink: true }}
              />
            </Grid>
          );
        }
      }  
    }
    let dynamicForm = [];
    //For every 2 grid items make a grid container. If list is at the end, make a complete grid container
    var pair = [];
    var itemsLength = 1;
    for(k in gridItems){
        pair.push(gridItems[k]);
        if(pair.length === 2){
          dynamicForm.push(
            <Grid
              container
              direction="row"
              justify="center"
              alignItems="center"
              key={"gc-"+ k}  
            >
              {[...pair]}
            </Grid>
          );
        // Reset the pair
          pair = [];
        // Otherwise if this is a situation in which there is only 1 remaining attribute, add it separately
        } else if(itemsLength === gridItems.length){
          dynamicForm.push(<Grid
            container
            direction="row"
            justify="center"
            alignItems="center"
            key={"gc-"+ k}   
          >
            {gridItems[k]}
          </Grid>
        );
      }
    }
    formContent = dynamicForm;
  }

  return (
    <div>
        <form className={classes.root} autoComplete="off">
          <Grid
            container
            direction="row"
            justify="center"
            alignItems="center"  
          >
            <Grid item xs={12}>
                <FormControl className={classes.formControl}>
                <InputLabel>Entity Type</InputLabel>
                <Select 
                    onChange={handleChange}>
                    {props.EntityTypes.map(option => 
                        (<MenuItem 
                            key={option.value} 
                            value={option.value}>{option.label}</MenuItem>
                            )
                    )}
                </Select>
                </FormControl>
            </Grid>
            {formContent}
            <Grid item xs={12}>
                <Button
                        variant="contained"
                        color="primary"
                        className={classes.button}
                        onClick={handleAddNode}>
                            Create
                </Button>
            </Grid>
          </Grid>
        </form>
    </div>
  );
}