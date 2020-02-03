# tsX
tsX application development. Note to developers new to Azure. When interacting with git from remote clients, 
credentials are required. Click on the tsX Cyber menu and choose clone. You should have an option to
generate credentials. Copy those into the challenge when prompted in your remote client.
## Installation
* Based on Docker images and orchestration of containers with Docker Compose that are behind an NGINX proxy server
* Install docker-compose
* Clone the repository
* Modify the configurations
  * Add domains and email addresses to init-letsencrypt.sh (lines 8 and 11)
  * Replace all occurrences of example.org with primary domain in data/nginx/app.conf (lines 3, 17, 20, 21, 26)
  * Create an apiserver/config.py file
  ```cmd
  cd tsX%20Cyber
  sudo vi apiserver/config.py
  ```
  * copy the following content into the config.py file replacing "<YOUR STUFF>" with the relevant information
  ```config.py
  HOST_IP = "172.19.0.2"
  HTTPS = "https://%s" % HOST_IP
  SECRET_KEY = "<YOUR STUFF>"
  MAIL_USERNAME = "<YOUR STUFF>"
  MAIL_PASSWORD = "<YOUR STUFF>"
  SHODAN = "<YOUR STUFF>"
  TWITTER_AUTH = (
      {
        "client_key": "<YOUR STUFF>",
        "client_secret": "<YOUR STUFF>",
        "token": "<YOUR STUFF>",
        "token_secret": "<YOUR STUFF>"
      }
  )
  ```
* Run the letsencrypt script. If there are any syntax errors, it may be due to the Windows to Linux editing. Remove the script and recreate it. Then copy and past the init script into the file and save.
```cmd
sudo bash ./init-letsencrypt.sh
```
* and then run the command
```cmd
sudo docker-compose up
```
This will initiate the steps in each Dockerfile within the orchestration template, docker-compse.yml. You will need to confirm that the odb1 ip address matches the config.py HOST_IP value. This will be shown in the summary output of the dockerized ODB setup. Change the value if it is different. You should see messages from the API server to setup the different databases.
```cmd
sudo docker-compose down
```
After the initial setup, run the command again and then setup the database through the API with http calls through any web browser or Postman. Enusre to save the passwords provided from the users end point as it provides 3 technical users:
```cmd
http://<YOUR-IP-ADDRESS>/osint/db_init
http://<YOUR-IP-ADDRESS>/users/db_init
```
### Front end (UX)
The webapp requires additional effort to configure within its own container so instead is set up separately and then daemonized using process management 2 (PM2). Move into the webapp directory and run the following commands starting with the installation of Node.js in case it doesn't exist:
- latest working doc: https://dev.to/zivka51084113/dockerize-create-react-app-in-3-minutes-3om3
```cmd
sudo apt-get update
sudo apt-get install nodejs
sudo apt-get install npm
sudo npm install
sudo npm start
```
This will have tested the app. Now set up the process manager to keep the app serving on 3000
- Create the site folder for the app to be served by NGINX. mkdir /var/www/tsx
- Next move the package, public and src to /var/www/tsx
- Move to the folder and run to build the production version of the app
```
sudo yarn start
sudo yarn build
```
Then install process manager2 (pm2) and start. This is likely not needed after build
```
sudo npm install pm2 -g
sudo pm2 start yarn -- start
```
To incorporate frontend changes, you will need to run the build process again with npm run build. If you’ve made changes to the server file, restart PM2 by running pm2 restart all. (https://www.freecodecamp.org/news/i-built-this-now-what-how-to-deploy-a-react-app-on-a-digitalocean-droplet-662de0fe3f48/)
### Setup with Postman
Postman is a collaboration platform for API development. It is used for 
testing the setup of the apiserver and proxy server setup. Postman runs 
on the local client and team members can be invited to collaborate on tests.
It is also used for setting up the application instead of using a CLI. 
- Download Postman to your local client at: https://www.getpostman.com/
- Download the TSX.postman_collection.json from the repository
- Open Postman and import the json. 
- Go to the ADMIN folder and send the users_init API call. This will set up the User database and routes.
- Copy down the users and their passwords. These are automated users that can be used 
for a variety of tasks including testing setup in the webapp


### Complete setup
At the command prompt shutdown the container with CTRL-C and then restart with docker-compose up.
This will ensure the databases are opened. Then back in Postman,
- Send the osint_init API. This will setup the OSINT database and routes.
- Go to the OSINT folder and send the cve API call. This will start the extraction of base MITRE data.
You should see the resulting calls in the command line output. There should be output messages as the
cve data is extracted into the database. This completes the API server setup. Continue testing with
user registration through the webapp. This will require changing the existing email source.

## Common Docker Tasks
```cmd
sudo docker rmi $(sudo docker images -f "dangling=true" -q).
sudo docker stop $(sudo docker ps -a -q)
sudo docker system prune
sudo docker volume prune
sudo docker run -v ${PWD}:/app -v /app/node_modules -p 3001:3000 --rm webapp
```
