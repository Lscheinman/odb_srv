/**
The main container for managing the nodes and edges that make up the user’s objects of
analysis. This includes a toolbar with buttons for functions, a detail panel for additional 
views such as geographic maps or editing node details, and the graph itself. These 
subcomponents are described separately. The main functions of the workbench start with CRUD
(create, read, update, delete) actions. All changes to the nodes are registered to the 
back-end server through the saveGraph function. This creates a “Case” entity in which all
nodes on the graphworkspace are linked to the “Case” with an edge/line/link/relation called
 “Attached”. Therefore many nodes can belong to many cases and when a graph is loaded, the
workbench manages the quality and ensures duplicates are not rendered.
 */

import React from 'react';
import Graph from '../components/Graph';
import AddNodeForm from '../components/AddNodeForm';
import Snackbar from '../components/SnackBar'
import AddLinkForm from '../components/AddLinkForm';
import SaveGraphForm from '../components/SaveGraphForm';
import LoadGraphForm from '../components/LoadGraphForm';
import SearchField from '../components/SearchField';
import Popover from '@material-ui/core/Popover';
import Paper from '@material-ui/core/Paper';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import AddNode from '@material-ui/icons/AddCircle';
import AddLine from '@material-ui/icons/SwapHorizontalCircle';
import Save from '@material-ui/icons/SystemUpdateAlt';
import Load from '@material-ui/icons/OpenInBrowserOutlined';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
    toolbar: {
        backgroundColor: "black",
        opacity: 0.6
    },
    paper: {
        backgroundColor: 'grey',
        opacity: 0.8,
        textAlign: 'center',
        color: theme.palette.text.secondary
    },
    canvas: {
        backgroundColor: 'black',
        opacity: 0.9,
        color: theme.palette.text.secondary
    },
    menuButton: {
        marginRight: theme.spacing(2),
      },
    title: {
        flexGrow: 1,
        marginRight: theme.spacing(2),
        display: 'none',
        [theme.breakpoints.up('sm')]: {
          display: 'block',
        },
      },
    inputRoot: {
        color: 'inherit',
      },
    inputInput: {
        padding: theme.spacing(1, 1, 1, 7),
        transition: theme.transitions.create('width'),
        width: '100%',
        [theme.breakpoints.up('sm')]: {
          width: 120,
          '&:focus': {
            width: 200,
          },
        },
      },
    heading: {
        fontSize: theme.typography.pxToRem(15),
        fontWeight: theme.typography.fontWeightRegular,
      },
  }));

export default function GraphWorkBench(props) {

    const classes = useStyles();
    const [graph, setGraph] = React.useState({...props.graph});
    const [open, setOpen] = React.useState(false);
    const [graphIndex, setGraphIndex] = React.useState([]); //Filled only during change functions
    const [message, setMessage] = React.useState("");
    const EntityTypes = [
        {label: "Attack Pattern", value: require('../assets/images/attack_pattern.svg')},
        {label: "Campaign", value: require('../assets/images/campaign.svg')},
        {label: "Course of Action", value: require('../assets/images/course_of_action.svg')},
        {label: "Identity", value: require('../assets/images/identity.svg')},
        {label: "Indicator", value: require('../assets/images/indicator.svg')},
        {label: "Intrusion Set", value: require('../assets/images/intrusion_set.svg')},
        {label: "Malware", value: require('../assets/images/malware.svg')},
        {label: "Observed Data", value: require('../assets/images/observed_data.svg')},
        {label: "Object", value: require('../assets/images/object.svg')},
        {label: "Report", value: require('../assets/images/report.svg')},
        {label: "Threat Actor", value: require('../assets/images/threat_actor.svg')},
        {label: "Tool", value: require('../assets/images/tool.svg')},
        {label: "Vulnerability", value: require('../assets/images/vulnerability.svg')},
        {label: "Case", value: require('../assets/images/case2.svg')},
        {label: "Session", value: require('../assets/images/session.svg')},
        {label: "User", value: require('../assets/images/user_icon.svg')},
        {label: "Blacklist", value: require('../assets/images/blacklist.svg')},
        {label: "Message", value: require('../assets/images/message.svg')},
    ];
    //Node attributes that shouldn't be shown when creating a new node or displaying infomration. Used by the Graph and AddNodeForm component
    const noShows = ["icon", "svg", "id", "node_key", "token", "class_name", "hash_key", "class", "ext_key"];
    // Make a quality checked version of the graph to pass to the workbench components
    let data = {nodes: [], links: []};
    let node_index = [];
    if (graph) {
        for(var n in graph.nodes){
            node_index.push(graph.nodes[n].key);
            // Check the node for values that may differ based on sourced from workbench or database
            if(!graph.nodes[n].hasOwnProperty("class_name")){
                graph.nodes[n]["class_name"] =  graph.nodes[n]["entityType"];
            }
            if(!graph.nodes[n].hasOwnProperty("key")){
                graph.nodes[n]["key"] = graph.nodes[n]["id"];
            }
            if(!graph.nodes[n].hasOwnProperty("description")){
                if(!graph.nodes[n].hasOwnProperty("label")){
                    graph.nodes[n]["description"] = graph.nodes[n]["class_name"] + " " + graph.nodes[n]["key"];
                }
            }
            // Create a shell that contains the most basic information
            console.log(graph.nodes[n]);
            let nodeshell = {
                id:graph.nodes[n].key,
                label: graph.nodes[n].description,
                entityType: graph.nodes[n].class_name,
                svg: EntityTypes.filter(entityType => entityType.label === graph.nodes[n].class_name)[0].value
              };
            // Get all the attributes included with the node
            for(var att in graph.nodes[n]){
                nodeshell[att] = graph.nodes[n][att];
            }
            // Add the node
            data.nodes.push(nodeshell);
        }
        // For internally established "links", copy them over to the existing graph. Lines (to, from), Links (target, source)
        if(graph.hasOwnProperty("links")){
            data.links = [...graph.links];
        }
        // Cycle through all the lines checking to ensure the link contains nodes that exist
        for(var t in graph.lines){
            if(node_index.includes(graph.lines[t].from) && node_index.includes(graph.lines[t].to)){
                data.links.push({
                    source: graph.lines[t].from,
                    target: graph.lines[t].to
                });
            }
        }
    // If there is no props.graph then fill with a sample graph
    } else {
        data = {
            nodes: [{id: "Sample", data: 5, color: "red", title: "li", label: "sample 1"}, {id: "Sample 2", data: 6, label: "sample 2"}, {id: "Sample 3", data: 9, label: "sample 3"}],
            links: [{source: "Sample", target: "Sample 2"}, {source: "Sample", target: "Sample 3"}],
        };

    };

    const handleAddNode = (event) => {
        console.log(event);
        // Copy the current graph
        let data = {...graph};
        // If there are no nodes then build the graph
        if(!data.hasOwnProperty("nodes")){
            data = {
                nodes: [],
                links: []
            };
        }
        // Create a node shell with key. The Node will be added to the database when the graph is saved
        let nodeShell = {id: Math.floor((Math.random() * 10000000) + 1)};
        let nodeDetail = {};
        // If there is no detail make a standard node
        if(event.length === 0){
            nodeDetail = {data: 5, color: "red", label: nodeShell.id + " Unknown"};
        // Copy the detail to add to the new Node
        } else {
            nodeDetail = {...event};
            if(nodeDetail.entityType){
                nodeDetail.label = nodeDetail.entityType + " " + nodeShell.id;

            }
        }
        // Combine the shell with the detials
        let newNode = {...nodeShell, ...nodeDetail};
        // Add the new node to the graph
        data.nodes.push(newNode);
        // Update the graph and close the popover
        setGraph(data);
        for(var d in data.nodes){
            console.log("Node " + d + " :" + data.nodes[d].label )
        }
        setAnchorEl(null);
    };
    const handleAddLink = (linkData) => {
        let data = {...graph};
        if(!data.hasOwnProperty("nodes")){
            data = {
                nodes: [],
                links: []
            };
        }
        if(!data.hasOwnProperty("links")){
            data["links"] = [];
        }
        data.links.push({source: linkData.source, target: linkData.target});
        setGraph(data);
        setAnchorEl(null);
    };
    const saveGraph = (formData) => {
        let oGraph = {...graph};
        let oForm = {...formData};

        if(oGraph.hasOwnProperty("nodes") && oGraph.hasOwnProperty("links")){
            (async () => {
                var form = new FormData();
                let graphCase = JSON.stringify({nodes: oGraph.nodes, lines: oGraph.links});
                form.append("graphCase", graphCase);
                form.append("Members", oForm.members);
                form.append("CreatedBy", props.currentUser);
                form.append("Classification", oForm.classification)
                form.append("graphName", oForm.graphName);
                const settings = {
                    method: 'POST',
                    body: form,
                    mode: 'cors'
                }
                const response = await fetch('https://intcitium.com/osint/save', settings);
                const results = await response.json();
                setMessage(results.message);
                setOpen(true);
                // Collect the list of items and assign the NODE_KEY to item key and item text to the NODE_NAME. TODO_ Truncate over 32 char
                var r = [];
                for(var t in results.data){
                    console.log(t);
                }
              })();
        }
    };
    const handleLoadGraph = (graphModel) => {
        // Ensure Index is up to date
        checkIndex();
        // Copy the existing graph into data
        let data = {...graph};
        let index = [...graphIndex];
        console.log(graphModel);
        // Check to ensure the current graph exists. If not create one
        if(!data.hasOwnProperty("nodes")){
            data = {
                nodes: [],
                links: []
            };
        } 
        if(!data.hasOwnProperty("links")){
            data.links = [];
            for(var l in data.lines){
                data.links.push({source: data.lines[l].from, target: data.lines[l].to})
            }
            data.lines = [];
        }
        // Call the service to load the graph
        if(graphModel.hasOwnProperty("key")){
            (async () => {
                console.log("Get the case " + graphModel.key);
                var form = new FormData();
                form.append("graphKey", graphModel.key);
                const settings = {
                    method: 'POST',
                    body: form,
                    mode: 'cors'
                }
                const response = await fetch('https://intcitium.com/osint/load_graph', settings);
                const results = await response.json();
                for(var r in results.message.nodes){
                    // Quality check on nodes that only have a key
                    if(!results.message.nodes[r].hasOwnProperty("id")){
                        results.message.nodes[r].id = results.message.nodes[r].key;
                    }
                    if(!index.includes(results.message.nodes[r].id)){
                        data.nodes.push(results.message.nodes[r]);
                        index.push(results.message.nodes[r].id);
                    }
                    console.log(results.message.nodes[r]);
                }
                if(results.message.hasOwnProperty("lines")){
                    for(var r in results.message.lines){
                        if(index.includes(results.message.lines[r].to) && index.includes(results.message.lines[r].from)){
                            data.links.push({
                                source: results.message.lines[r].from, 
                                target: results.message.lines[r].to
                            });
                            index.push(results.message.lines[r].from + results.message.lines[r].to);
                        }
                    }
                }
                setGraphIndex(index);
                setGraph(data);
            })();
        }
        // Close the popup
        setAnchorEl(null);


    };
    const updateGraph = (oGraph) => {
        /**
         * Expects an oGraph consisting of nodes, links or lines. In the case of lines, they need to be changed over to links
         * Similar to the initial function setting up the graph, do a quality check to ensure consistency
         */
        // Copy the existing graph 
        let data = {...graph};
        // If the graph is some how empty in which no nodes exist, create a new copy of the graph with data
        if(!data.hasOwnProperty("nodes")){
            data = {
                nodes: [],
                links: []
            };
        }
        let newGraph = null;
        // If the existing graph has lines and not links, change them over to links and set the updateGraph
        if(data.hasOwnProperty("lines")){
            newGraph = {
                nodes: [...data.nodes],
                links: []
            } 
            for(var n in data.lines){
                newGraph.links.push({
                    source: data.lines[n].from,
                    target: data.lines[n].to
                });
            }
        } else {
            newGraph = {
                nodes: [...data.nodes],
                links: [...data.links]
            }
        }
        // Set up an index consisting of all the existing nodes
        let node_index = [];
        for(var n in newGraph.nodes){
            node_index.push(newGraph.nodes[n].id);
        }
        // Fill in the new nodes to the update graph
        for(var n in oGraph.nodes){
            if(!node_index.includes(oGraph.nodes[n].id)){
                newGraph.nodes.push(oGraph.nodes[n]);
                node_index.push(oGraph.nodes[n].id);
            }
        }
        // Cycle through all the lines checking to ensure the link contains nodes that exist
        if(oGraph.hasOwnProperty("lines")){
            for(var t in graph.lines){
                if(node_index.includes(graph.lines[t].from) && node_index.includes(graph.lines[t].to)){
                    newGraph.links.push({
                        source: oGraph.lines[t].from,
                        target: oGraph.lines[t].to
                    });
                }
            }
        }
        // In the case the graph has links, cycle through with the same 
        if(oGraph.hasOwnProperty("links")){
            for(var t in oGraph.links){
                if(node_index.includes(oGraph.links[t].source) && node_index.includes(oGraph.links[t].target)){
                    newGraph.links.push({
                        source: oGraph.links[t].source,
                        target: oGraph.links[t].target
                    });
                }
            }
        }
        setGraph(newGraph);
    };
    const updateNode = (oNode) => {
        /**
         * The oNode is an updated version of the selectedNode from the Graph component. It should replace
         * the current graph version of the node and then set the graph. When the graph is saved, the updates
         * are written to the DB in the user's case.
         */
        console.log(oNode);
        let newGraph = {...graph};
        for(var n in newGraph.nodes){
            if(!newGraph.nodes[n].hasOwnProperty("id")){
                newGraph.nodes[n].id = newGraph.nodes[n].key;
            }
            if(newGraph.nodes[n].id === oNode.id){
                var uNode = {...newGraph.nodes[n]};
                for(var a in uNode){
                    if(oNode.hasOwnProperty(a)){
                        uNode[a] = oNode[a];
                    }
                }
                newGraph.nodes[n] = uNode;
                break;
            }
        }
        setGraph(newGraph);
    };
    const removeNode = (nodeID) => {
        /* 
        Only remove the node from the graph and ensure links with the node are also removed.
        If this is the first time a graph is being edited, it may contain lines instead of links so
        the extra quality step is included
        */
        let data = {...graph};
        let newGraph = {nodes: [], links: []}
        if(data.nodes.length > 1){
            for(var n in data.nodes){
                if(data.nodes[n].id !== nodeID){
                    if(data.nodes[n].key !== nodeID){
                        newGraph.nodes.push(data.nodes[n]);
                    }
                }
            }
            if(data.hasOwnProperty("lines")){
                for(var l in data.lines){
                    if(data.lines[l].from !== nodeID && data.lines[l].to !== nodeID){
                        newGraph.links.push({source: data.lines[l].from, target: data.lines[l].to});
                    }
                }
            }
            if(data.hasOwnProperty("links")){
                for(var l in data.links){
                    if(data.links[l].source !== nodeID && data.links[l].target !== nodeID){
                        newGraph.links.push(data.links[l]);
                    }
                }
            }
            setGraph(newGraph);
        } else {
            setMessage("Graph requires at least 1 node. Either exit the workbench or start a new search before deleting this last node.");
            setOpen(true);
        }
    };
    const handleCloseSnackBar = () => {
        setOpen(false);
    };
    const checkIndex = () => {
        let data = {...graph};
        let index = [...graphIndex];
        for(var n in data.nodes){
            if(!index.includes(data.nodes[n].id)){
                index.push(data.nodes[n].id);
            }
        }
        for(n in data.links){
            if(!index.includes(data.links[n].source + data.links[n].target)){
                index.push(data.links[n].source + data.links[n].target);
            }
        }
        setGraphIndex(index);
    };

    // Graph Object
    let graphMain = (
        <Paper className={classes.canvas}>
            <Graph
                graph={data}
                saveGraph={saveGraph}
                users={props.users}
                entityTypes={EntityTypes}
                removeNode={removeNode}
                updateNode={updateNode}
                noShows={noShows}
            />
            <Snackbar 
                close={handleCloseSnackBar}
                message={message}
                open={open}
            />
        </Paper>
    );

    // Tool Popover
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [tPopTitle, setPopTitle] = React.useState(null);
    const [tPopContent, setPopContent] = React.useState(null);
    const tPopopen = Boolean(anchorEl);
    const id = tPopopen ? 'simple-popover' : undefined;

    const handleClick = event => {
        setAnchorEl(event.currentTarget);
        if(event.currentTarget.id === "addlinkButton"){
            setPopTitle("Add link");
            setPopContent(<AddLinkForm addLink={handleAddLink} graph={data}/>);
        } else if(event.currentTarget.id === "addnodeButton") {
            setPopTitle("Add node");
            setPopContent(
                <AddNodeForm 
                    addNode={handleAddNode} 
                    EntityTypes={EntityTypes} 
                    osintModel={props.osintModel}
                    noShows={noShows}/>);
        } else if(event.currentTarget.id === "loadGraphButton") {
            setPopTitle("Load graph");
            setPopContent(
                <LoadGraphForm
                     loadGraph={handleLoadGraph} 
                     graphs={props.graphs}/>);
        } else {
            setPopTitle("Save Graph");
            setPopContent(
                <SaveGraphForm 
                    saveGraph={saveGraph} 
                    users={props.users}/>);
        }
    };
    const handleClose = () => {
        setAnchorEl(null);
    };
    // Dynamic Popover for Adding nodes, links, saving or loading graphs and other Toolbar functions.
    let ToolPopover = (
        <Popover
            id={id}
            open={tPopopen}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
            }}
        >   <Paper className={classes.paper}>
                <Typography className={classes.title} variant="h6">{tPopTitle}</Typography>
                {tPopContent}
            </Paper>

        </Popover>
      );

    return (
        <div>
            <Toolbar className={classes.toolbar}>
                <IconButton
                    id="addnodeButton"
                    edge="start"
                    className={classes.menuButton}
                    onClick={handleClick}
                    aria-label="Add node"
                >
                    <AddNode />
                </IconButton>
                <IconButton
                    id="addlinkButton"
                    edge="start"
                    className={classes.menuButton}
                    onClick={handleClick}
                    aria-label="Add link"
                >
                    <AddLine />
                </IconButton>
                <IconButton
                    id="saveGraphButton"
                    edge="start"
                    className={classes.menuButton}
                    onClick={handleClick} //saveGraph
                    aria-label="Save Graph"
                >
                    <Save />
                </IconButton>
                <IconButton
                    id="loadGraphButton"
                    edge="start"
                    className={classes.menuButton}
                    onClick={handleClick} //loadGraph
                    aria-label="Load Graph"
                >
                    <Load />
                </IconButton>
                <Typography className={classes.title} variant="h6" noWrap>
                    Data Science Workbench
                </Typography>
                <div>
                    <SearchField
                        updateGraph={updateGraph}
                        EntityTypes={EntityTypes}
                        graph={data}
                    />
                </div>
            </Toolbar>
            {ToolPopover}
            {graphMain}
        </div>
    );
}