"""
Main entry point for exposure of all API routes
"""
from flask import Flask
from apiserver.blueprints.home import home
from apiserver.blueprints.users import users
from apiserver.blueprints.osint import osint


def create_app():

    app = Flask(__name__)
    app.register_blueprint(home)
    app.register_blueprint(users)
    app.register_blueprint(osint)

    return app
