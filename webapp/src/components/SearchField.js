/*
The component is mainly used within the GraphWorkSpace toolbar for the user to populate
the graph with nodes from the API service. The nodes are retrieved by using the API service’s
Lucene text indexing on the description field of all the nodes within the database. The top
10 of each entity type are returned where values matched. The user can then select one of
the search results which returns that node and all of the other nodes which have a direct 
relationship. Therefore this calls the get_neighbors service. 
 */

import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import SearchIcon from '@material-ui/icons/Search';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';

const useStyles = makeStyles(theme => ({
    root: {
      padding: 10,
      display: 'flex',
      alignItems: 'right',
      width: 400,
      verticalAlign: 'baseline'
    },
    input: {
      marginLeft: theme.spacing(1),
      flex: 1,
    },
    iconButton: {
      padding: 10,
    },
    typography: {
      padding: theme.spacing(2),
    }
  }));

export default function SearchField(props) {
    const classes = useStyles();
    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState([]);
    const [anchorEl, setAnchorEl] = React.useState(null);

    //Change the query value based on the input
    const handleChange = e => {
        setQuery(e.target.value);
    };
    
    // Make the call to the back end to get suggestion items that will fill the list based on the search query 
    const startSearch = event => {
        console.log("Querying with: " + query);
        (async () => {
          var form = new FormData();
          form.append("searchterms", query);
          const settings = {
              method: 'POST',
              body: form
          }
          const response = await fetch('https://intcitium.com/osint/get_suggestion_items', settings);
          const results = await response.json();
          // Collect the list of items and assign the NODE_KEY to item key and item text to the NODE_NAME. TODO_ Truncate over 32 char
          var r = [];
          for(var t in results.data){
              r.push(
              <MenuItem
                onClick={loadSelected}
                key={results.data[t].NODE_KEY}
                value={results.data[t].NODE_KEY}
                id={results.data[t].NODE_KEY}
                >
                {results.data[t].NODE_NAME}
              </MenuItem>);
          }
          setResults(r);
        })();  
        setAnchorEl(event.currentTarget); 
    };
    // Close the suggestions list
    const handleClose = () => {
      setAnchorEl(null);
    };

    // Load the selected MenuItem to the graph
    const loadSelected = (event) => {
      // Get the icon from the EntityTypes
      let icon = props.EntityTypes.filter(EntityType => EntityType.label === "Vulnerability")[0];
      // Set the values from the MenuItem attributes
      var selected = {
        id: event.target.id,
        label: event.target.innerText,
        entityType: "Vulnerability",
        icon: icon.value
      };
      console.log(selected);
      // Get the neighbors

        (async () => {
            var form = new FormData();
            form.append("nodekey", event.target.id);
            const settings = {
                method: 'POST',
                body: form
            }
            // Send the request and save in response
            const response = await fetch('https://intcitium.com/osint/get_neighbors_index', settings);
            // Change the results into a json
            const results = await response.json();
            // Set up a model for the graph
            let graph = {nodes: [], links: []}
            // Cycle through the graph and store the results 
            for(var t in results.data.nodes){
                let nodeshell = {
                  id:results.data.nodes[t].key,
                  label: results.data.nodes[t].description,
                  entityType: results.data.nodes[t].class_name,
                  icon: props.EntityTypes.filter(EntityType => EntityType.label === results.data.nodes[t].class_name)[0].value
                };
                for(var att in results.data.nodes[t]){
                  nodeshell[att] = results.data.nodes[t][att];
                }
                console.log(nodeshell);
                graph.nodes.push(nodeshell);
            }
            for(var t in results.data.lines){
              graph.links.push({
                  source:results.data.lines[t].from,
                  target:results.data.lines[t].to
                });
            }
            props.updateGraph(graph);
        })();
    }

  return (
      <div className={classes.root}>
        <TextField 
          label="Search" 
          variant="filled"
          onChange={handleChange}/>
        <IconButton 
          className={classes.iconButton} 
          aria-label="search"
          variant="contained"
          onClick={startSearch}>
        <SearchIcon />
        </IconButton>
        <Menu
          id="simple-menu"
          anchorEl={anchorEl}
          keepMounted
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
        {results}
      </Menu>
    </div>  
  );
}