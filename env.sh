#!/bin/bash

# Generate env-config.js with environment variables
# This allows runtime configuration of the React app in Docker

# Recreate config file
rm -rf /usr/share/nginx/html/env-config.js
touch /usr/share/nginx/html/env-config.js

# Add assignment 
echo "window._env_ = {" >> /usr/share/nginx/html/env-config.js

# Read environment variables that start with REACT_APP_ and add them to env-config.js
for envVar in $(env | grep -o "^REACT_APP_.*"); do
  varName=$(echo $envVar | sed -e 's/=.*//')
  varValue=$(echo $envVar | sed -e 's/^[^=]*=//')
  
  # Add to config file
  echo "  $varName: \"$varValue\"," >> /usr/share/nginx/html/env-config.js
done

# Close the object
echo "}" >> /usr/share/nginx/html/env-config.js