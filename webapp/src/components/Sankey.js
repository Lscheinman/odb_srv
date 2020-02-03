import React from 'react';
import ReactSankey from 'react-sankey';
import Paper from '@material-ui/core/Paper';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
    root: {
        padding: theme.spacing(3, 2),
    },
    paper: {
        padding: theme.spacing(2),
        display: 'flex',
        overflow: 'auto',
        flexDirection: 'column',
    },
    fixedHeight: {
        height: 600,
    },
    }));

export default function Sankey(props){
    const classes = useStyles();
    const fixedHeightPaper = clsx(classes.paper, classes.fixedHeight);
    const createNode = (title, value, id) => ({ title, value, id });
    const createLink = (sourceId, targetId) => ({ sourceId, targetId });
        
    const nodes = {
    '0':  createNode('CVE-2019-17050', 5091520, 0),
    '1':  createNode('Code Execution', 1731117, 1),
    '2':  createNode('Overflow', 1069219, 2),
    '3':  createNode('Memory Corruption', 865558, 3),
    '4':  createNode('Sql Injection', 254576, 4),
    '5':  createNode('XSS', 203660, 5),
    '6': createNode('Microsoft', 1211782, 6),
    '7': createNode('Oracle', 346223, 7),
    '8': createNode('Google', 17311, 8),
    '9': createNode('Apple', 1403, 9),
    '10': createNode('Debian', 1504, 10),
    '11': createNode('Ubuntu', 1605, 11),
    };
        
    const links = [
    createLink(0, 1),
    createLink(0, 2),
    createLink(0, 3),
    createLink(0, 4),
    createLink(0, 5),
    createLink(1, 6),
    createLink(1, 7),
    createLink(1, 8),
    createLink(2, 9),
    ];
    
    return(
        <Paper className={fixedHeightPaper}>
            <ReactSankey
            rootID={0}
            nodes={nodes}
            links={links}
            hasArrows
            />
        </Paper>
        );
    
}