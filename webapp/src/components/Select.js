import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

const useStyles = makeStyles(theme => ({
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
}));

export default function SimpleSelect(props) {
  const classes = useStyles();
  const [selected, setSelected] = React.useState(props.value);
  
  const handleChange = event => {
    setSelected(event.target.value);
  };

  return (
    <div>
      <FormControl className={classes.formControl}>
      <InputLabel>{props.label}</InputLabel>
      <Select
        value={selected}
        onChange={handleChange}
      >
        {props.items.map(option => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>))}
      </Select>
    </FormControl>
    </div>
  );
}