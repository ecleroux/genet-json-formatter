#!/bin/bash

# Add Node.js to PATH and run npm with any arguments passed
export PATH="/usr/local/bin:$PATH"
exec npm "$@"