import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Popover from '@material-ui/core/Popover';
import Typography from '@material-ui/core/Typography';

const useStyles = makeStyles(theme => ({
  typography: {
    padding: theme.spacing(2),
  },
}));

export default function SimplePopover(props) {
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = React.useState(props.open);

  const handleClose = () => {
    setAnchorEl(null);
  };

  const id = open ? 'node-popover' : undefined;
  
  return (
    <div>
      <Popover
        id={id}
        open={props.open}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={{ top: 200, left: 400 }}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Typography className={classes.typography}>The content of the Popover.</Typography>
      </Popover>
    </div>
  );
}