/*
Base level Graph functions that use the react-d3-graph library Documentation for the library 
can be found at https://goodguydaniel.com/react-d3-graph/docs/. The standard library provides
events such as interactions with Nodes and edges including clicking or hovering. The graph 
therefore maintains a selectedNode and the associated information that should be shown.
TODO: Multi-select
 */
import React, { useState }  from 'react';
import { Graph } from 'react-d3-graph';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Grid from '@material-ui/core/Grid';
import Fab from '@material-ui/core/Fab';
import ExpandIcon from '@material-ui/icons/ChevronLeft';
import ShrinkIcon from '@material-ui/icons/ChevronRight';
import CloseIcon from '@material-ui/icons/Close';
import DeleteIcon from '@material-ui/icons/DeleteOutline';
import EditIcon from '@material-ui/icons/Edit';
import UpdateIcon from '@material-ui/icons/Autorenew';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { Map, CircleMarker, TileLayer } from "react-leaflet";
import { makeStyles } from '@material-ui/core/styles';
import { TextField } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
    fabs: {
        margin: theme.spacing(1)
    },
  }));

export default function Netgraph(props) {
    const classes = useStyles();
    const [graphSize, setGraphSize] = useState(12);
    const [nodeInfo, setNodeInfo] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [selectedNode, setSelectedNode] = useState(null);
    const [updateForm, setUpdateForm] = useState({});
    const [expandIcon, setExpandIcon] = useState(<ExpandIcon/>);
    const noShows = [...props.noShows];
    
    const handleClickOpen = (nodeId) => {
        let nodeDetails = props.graph.nodes.filter(
            node => node.id == nodeId);
        let nodeDict = {...nodeDetails[0]};
        filterandSetNodeInfo(nodeDict);
        setGraphSize(9);
        setSelectedNode(nodeId);
    };

    const toggleExpand = () => {
        if(graphSize === 9){
            setGraphSize(6);
            setExpandIcon(<ShrinkIcon/>);
        } else {
            setGraphSize(9);
            setExpandIcon(<ExpandIcon/>);
        }
    };

    const handleRemoveNode = () => {
        props.removeNode(selectedNode);
        setSelectedNode(null);
        setNodeInfo(null);

    };

    const handleUpdateNode = () => {
        // Clicked from the details panel when in edit mode. Sends the updateForm to the graphWorkbench
        let sNode = {id: selectedNode};
        for(var u in updateForm){
            if(updateForm[u] !== ""){
                sNode[u] = updateForm[u];
            }
        }
        props.updateNode(sNode);
        console.log(sNode);
    };

    const closeDetails = () => {
        setGraphSize(12);
    };

// the graph configuration, you only need to pass down properties
// that you want to override, otherwise default ones will be used
    const myConfig = {
        nodeHighlightBehavior: true,
        directed: true,
        focusZoom: 5, //This doesn't seem to have affect
        height: 700, //TODO, auto-detect for mobile device?,
        width: 1000, //TODO, auto-detect for mobile device?,
        node: {
            size: 200,
            highlightStrokeColor: "white",
            renderLabel: true,
            labelProperty: "entityType",
            fontColor: "white",
            fontSize: 8,
        },
        link: {
            highlightColor: "yellow",
            renderLabel: true,
            fontColor: "white" 
        },
    };
// graph event callbacks
    const onClickGraph = function() {
        console.log("GRAPH CLICKED");
    };

    const onDoubleClickNode = function(nodeId) {
        window.alert(`Double clicked node ${nodeId}`);
    };

    const onRightClickNode = function(event, nodeId) {
        window.alert(`Right clicked node ${nodeId}`);
    };

    const attsToList = function(nodeDict){
        /**
         * Helper function to set details to a non-editable list
         */
        let atts = [];
        for(var i in nodeDict){
            // Don't show unecessary data like keys, IDs or duplicate info
            if(!noShows.includes(nodeDict[i]) && !noShows.includes(i.toLowerCase())){
                atts.push(
                    <ListItem key={i}>
                        <ListItemText primary={nodeDict[i]} secondary={i} />
                    </ListItem>
                );
            }

        }
        return atts;

    };

    const attsToInput = function(nodeDict){
        let atts = [];
        for(var i in nodeDict){
            // Don't show unecessary data like keys, IDs or duplicate info
            if(!noShows.includes(nodeDict[i]) && !noShows.includes(i.toLowerCase())){
                atts.push(
                    <TextField key={i} label={i} id={i} onChange={onAttributeChange}>
                        {nodeDict[i]}
                    </TextField>
                );
            }
        }
        return atts;
    };
    
    const filterandSetNodeInfo = function(nodeDict){
        setEditMode(false);
        let atts = attsToList(nodeDict);
        setNodeInfo(<List>{atts}</List>);
    };

    const onAttributeChange = function(event){
        // Handle all changes to the update form so it can be sent to the workbench to change node information
        let uForm = {...updateForm};
        uForm[event.target.id] = event.target.value;
        setUpdateForm(uForm);
    };

    const toggleEditNode = function(){
        // Change the model variable which will trigger rendering the appropriate detail format. Input or list item
        setEditMode(!editMode);
    };

    const onMouseOverNode = function(nodeId) {
        // Change the detail panel to show the hovered node's details
        console.log(nodeId + " " + graphSize + " node info: " + nodeInfo);
        setSelectedNode(nodeId);
        let nodeDetails = props.graph.nodes.filter(
            node => node.id == nodeId);
        let nodeDict = {...nodeDetails[0]};
        filterandSetNodeInfo(nodeDict);
        //open up a pop-over showing a menu of options for the node
    };

    const onMouseOutNode = function(nodeId) {
        console.log("MOUSEOUT: " + nodeId);
        //close pop-over showing a menu of options for the node
    };

    const onClickLink = function(source, target) {
        window.alert(`Clicked link between ${source} and ${target}`);
    };

    const onRightClickLink = function(event, source, target) {
        window.alert(`Right clicked link between ${source} and ${target}`);
    };

    const onMouseOverLink = function(source, target) {
        //window.alert(`Mouse over in link between ${source} and ${target}`);
    };

    const onMouseOutLink = function(source, target) {
        //window.alert(`Mouse out link between ${source} and ${target}`);
    };
    /**
     * Start the actual build of the graph components which will be displayed. 
     * Edit buttons which determine updating a node within the details window
     * Widgets including 
     */
    // Widgets are contained in the side panel including the details of the node and other analysis tools like maps.
    let widgets = null;
    // Set the edit button for the node details panel. If not in edit mode the onClick sets the mode and changes the form
    let editModeButton = (
        <Grid item xs>
            <Fab color="primary" aria-label="add" onClick={toggleEditNode} size="small" className={classes.fabs}>
                <EditIcon />
            </Fab>
        </Grid>
    );
    let editButton = null;
    let nodeDetails = props.graph.nodes.filter(
        node => node.id == selectedNode)[0];
    let atts = [];
    // For editing the node details
    if(editMode){
        atts = attsToInput(nodeDetails);
        // The editmode button is highlighted and can switch back into "view" mode
        editModeButton = (
            <Grid item xs>
                <Fab color="secondary" aria-label="add" onClick={toggleEditNode} size="small" className={classes.fabs}>
                    <EditIcon />
                </Fab>
            </Grid>
        );
        // The edit button which will send the update form to the workbench
        editButton = (
            <Grid item xs={12}>
                <Fab color="secondary" aria-label="add" onClick={handleUpdateNode} size="small" className={classes.fabs}>
                    <UpdateIcon />
                </Fab>
            </Grid>
        );
    // Default shows an uneditable list
    }else{
        console.log("hello");
        atts = attsToList(nodeDetails);
    }
    // If the graph isn't full size then details are being shown. Fill the details with model data
    if (graphSize !== 12){
        widgets = (                    
            <Paper >
                <Grid 
                    container 
                    direction="row"
                    justify="flex-start"
                    alignItems="center"
                    >
                    <Grid item xs>
                        <Fab color="primary" aria-label="add" onClick={toggleExpand} size="small" className={classes.fabs}>
                            {expandIcon}
                        </Fab>
                    </Grid>
                    <Grid item xs>
                        <Fab color="primary" aria-label="add" onClick={closeDetails} size="small" className={classes.fabs}>
                            <CloseIcon />
                        </Fab>
                    </Grid>
                </Grid>
                <ExpansionPanel>
                    <ExpansionPanelSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel1a-content"
                    id="panel1a-header"
                    >
                    <Typography variant="h6">Details</Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails>
                        <Grid 
                            container 
                            direction="row"
                            justify="flex-end"
                            alignItems="center"
                            >
                            <Grid item xs>
                                <Fab color="secondary" aria-label="add" onClick={handleRemoveNode} size="small" className={classes.fabs}>
                                    <DeleteIcon />
                                </Fab>
                            </Grid>
                            {editModeButton}
                            <Grid item xs={12}>
                                {atts}
                            </Grid>
                            {editButton}
                        </Grid>

                    </ExpansionPanelDetails>
                </ExpansionPanel>
                <ExpansionPanel>
                    <ExpansionPanelSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel1a-content"
                    id="panel1a-header"
                    >
                    <Typography  variant="h6">Maps</Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails>
                        <Map
                            style={{ height: "480px", width: "100%" }}
                            zoom={1}
                            center={[-0.09, 51.505]}>
                            <TileLayer url="http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <CircleMarker
                            center={[51.505, -0.09]}
                            />
                        </Map>
                    </ExpansionPanelDetails>
                </ExpansionPanel>
            </Paper>
        );

    }

    return(
        <div>
            <Grid 
                container 
                spacing={1}
                direction="row"
                justify="space-evenly"
                alignItems="stretch"
                >
                <Grid item xs={graphSize}>
                    <Graph
                        id="graph-id" // id is mandatory, if no id is defined rd3g will throw an error
                        data={props.graph}
                        config={myConfig}
                        onClickNode={handleClickOpen}
                        onRightClickNode={onRightClickNode}
                        onClickGraph={onClickGraph}
                        onClickLink={onClickLink}
                        onRightClickLink={onRightClickLink}
                        onMouseOverNode={onMouseOverNode}
                        onMouseOutNode={onMouseOutNode}
                        onMouseOverLink={onMouseOverLink}
                        onMouseOutLink={onMouseOutLink}
                    />
                </Grid>
                <Grid item xs>
                    {widgets}
                </Grid>
            </Grid>
        </div>
    );
}