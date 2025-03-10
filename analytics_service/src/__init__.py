# analytics_service/src/__init__.py
from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__,
                static_folder='../static',
                template_folder='../templates')
    
    # Enable CORS for all routes
    CORS(app)
    
    # Config setup
    app.config.from_mapping(
        SECRET_KEY='analytics_service_secret_key',
        DATABASE_URL=None,  # Will be set from environment if available
    )
    
    # Register blueprints
    from . import routes
    app.register_blueprint(routes.bp)
    
    from . import api
    app.register_blueprint(api.bp)
    
    return app