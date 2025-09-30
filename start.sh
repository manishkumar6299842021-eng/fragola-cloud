#!/usr/bin/env bash

# Exit on error
set -o errexit

# Check if SSH_KEY environment variable is defined
if [ -z "$SSH_KEY" ]; then
    echo "Error: SSH_KEY environment variable is not defined" >&2
    exit 1
fi

# Build a local .ssh folder on Render
mkdir -p ~/.ssh

# Add GitHub as a known host so it does not prompt you to add
# GitHub's IP address to known_hosts
ssh-keyscan -H github.com >> ~/.ssh/known_hosts 2> /dev/null

# Copy your secret file to the local .ssh folder and chmod it.
# This grabs the SSH_KEY from your environment group and
# reverses the Base64 encoding to transform it back into a file
echo "$SSH_KEY" | base64 -d > ~/.ssh/id_ecdsa
chmod 600 ~/.ssh/id_ecdsa
echo "SSH key copied to: $(realpath ~/.ssh/id_ecdsa)"

# This next piece sets up your SSH configuration for all
# hosts. More info about these commands is available on the web.
cat > ~/.ssh/config << EOF
Host *
   StrictHostKeyChecking no
   UserKnownHostsFile /dev/null
   LogLevel ERROR
EOF

bun index.ts