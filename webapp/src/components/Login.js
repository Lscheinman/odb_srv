import React from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

export default function FormDialog(props) {
    const [dialogType, setType] = React.useState("login");
    const [userName, setUserName] = React.useState(null);
    const [userPassword, setUserPassword] = React.useState(null);
    const [userEmail, setUserEmail] = React.useState(null);
    const changeDialogType = () => {
        if(dialogType === "login"){
            setType("register");

        } else {
            setType("login");
        }
    };

    const handleChangeUserName = event => {
        setUserName(event.target.value);
    };

    const handleChangeUserPassWord = event => {
        setUserPassword(event.target.value);
    };

    const handleChangeUserEmail = event => {
        setUserEmail(event.target.value);
    };
    
    const handleClearForm = () => {
        setUserEmail(null);
        setUserName(null);
        setUserPassword(null);
        props.close();
    };

    const handleRegister = () => {
        let userData = {
            userName: userName,
            userPassword: userPassword,
            userEmail: userEmail
        };
        console.log(userData);
        props.register(userData);
    };

    const handleLogin = () => {
        let userData = {
            userName: userName,
            userPassword: userPassword
        };
        console.log(userData);
        props.login(userData);
    };

    let dialogContent = (
        <Dialog open={props.open} onClose={props.userLogin} aria-labelledby="form-dialog-title">
            <DialogTitle id="form-dialog-title">Authentication and Registration</DialogTitle>
            <DialogContent>
            <DialogContentText>
                Login using your name and password to access TSX apps or click register to create a new user
            </DialogContentText>
            <TextField
                autoFocus
                margin="dense"
                onChange={handleChangeUserName}
                label="User name"
                type="email"
                fullWidth
            />
            <TextField
                margin="dense"
                onChange={handleChangeUserPassWord}
                label="Password"
                type="password"
                fullWidth
            />
            </DialogContent>
            <DialogActions>
            <Button onClick={handleClearForm} color="primary">
                Cancel
            </Button>
            <Button onClick={handleLogin} color="primary">
                Login
            </Button>
            <Button onClick={changeDialogType} color="primary">
                Register
            </Button>
            </DialogActions>
        </Dialog>
    );
    if(dialogType === "register"){
        dialogContent = (
        <Dialog open={props.open} onClose={props.userLogin} aria-labelledby="form-dialog-title">
            <DialogTitle id="form-dialog-title">Authentication and Registration</DialogTitle>
            <DialogContent>
            <DialogContentText>
                Create a new user and then confirm registration through the email you provided. You will then be able to login.
            </DialogContentText>
            <TextField
                autoFocus
                margin="dense"
                onChange={handleChangeUserName}
                label="User name"
                type="email"
                fullWidth
            />
            <TextField
                margin="dense"
                onChange={handleChangeUserPassWord}
                label="Password"
                type="password"
                fullWidth
            />
            <TextField
                margin="dense"
                label="Email"
                type="email"
                onChange={handleChangeUserEmail}
                fullWidth
            />
            </DialogContent>
            <DialogActions>
            <Button onClick={handleClearForm} color="primary">
                Cancel
            </Button>
            <Button onClick={changeDialogType} color="primary">
                Login
            </Button>
            <Button onClick={handleRegister} color="primary">
                Register
            </Button>
            </DialogActions>
        </Dialog>
        );
    }

    return (
        <div>
            {dialogContent}
        </div>
  );
}