import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import GameSetupIconMain from '@material-ui/icons/Settings';
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import ListItem from "@material-ui/core/ListItem";
import { makeStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

const useStyles = makeStyles(theme => ({
    root: {
        display: 'flex',
        flexWrap: 'wrap',
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
    },
    selectEmpty: {
        marginTop: theme.spacing(2),
    },
}));

export default function CreateGamePopUp(props) {
    const [open, setOpen] = React.useState(false);
    const [values, setValues] = React.useState({
        selection: '',
        name: 'hai',
    });

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };
    const classes = useStyles();

    const availableGames = props.availableGames.map((game) => {
        return <MenuItem key={game.id} value={game.id}>
            {game.name}
        </MenuItem>
    });

    function handleChange(event) {
        setValues(oldValues => ({
            ...oldValues,
            [event.target.name]: event.target.value,
        }));
    }

    return (
        <div>
            <ListItem button key="GameMenuButton">
                <ListItemIcon>
                    <GameSetupIconMain onClick={handleClickOpen}/>
                </ListItemIcon>
                <ListItemText primary="Game setup" />
            </ListItem>
            <Dialog
                open={open}
                onClose={handleClose}
                aria-labelledby="draggable-dialog-title"
            >
                <DialogTitle style={{ cursor: 'move' }} id="draggable-dialog-title">
                    Game setup
                </DialogTitle>
                <DialogContent>
                    <form className={classes.root} autoComplete="off">
                        <FormControl className={classes.formControl}>
                            <InputLabel>Create Game</InputLabel>
                            <Select
                                value={values.selection}
                                onChange={handleChange}
                                inputProps={{
                                    name: 'selection',
                                    id: 'selection-simple',
                                }}
                            >
                                <MenuItem key="select1" value="2">2</MenuItem>
                                <MenuItem key="select2" value="3">3</MenuItem>
                                <MenuItem key="select3" value="4">4</MenuItem>
                                <MenuItem key="select4" value="5">5</MenuItem>
                                <MenuItem key="select5" value="6">6</MenuItem>
                                <MenuItem key="select6" value="7">7</MenuItem>
                                <MenuItem key="select7" value="8">8</MenuItem>
                                <MenuItem key="select8" value="9">9</MenuItem>
                                <MenuItem key="select9" value="10">10</MenuItem>
                            </Select>
                        </FormControl>
                    </form>
                    <Button onClick={props.create} value={values.selection}>Create</Button>
                    <form className={classes.root} autoComplete="off">
                        <FormControl className={classes.formControl}>
                            <InputLabel>Get Game</InputLabel>
                            <Select
                                value={values.selection}
                                onChange={handleChange}
                                inputProps={{
                                    name: 'selection',
                                    id: 'selection-simple',
                                }}>
                                {availableGames}
                            </Select>
                        </FormControl>
                    </form>
                    <Button onClick={props.selected} value={values.selection}>Get</Button>
                    <form className={classes.root} autoComplete="off">
                        <FormControl className={classes.formControl}>
                            <InputLabel>Delete Game</InputLabel>
                            <Select
                                value={values.selection}
                                onChange={handleChange}
                                inputProps={{
                                    name: 'selection',
                                    id: 'selection-simple',
                                }}>
                                {availableGames}
                            </Select>
                        </FormControl>
                    </form>
                    <Button onClick={props.deleted} value={values.selection}>Delete</Button>
                </DialogContent>
            </Dialog>
        </div>
    );
}