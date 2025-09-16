FROM ubuntu:latest AS conflux

# # Define build arguments for Conflux node configuration
ARG CONFLUX_ROOT="/opt/conflux"

# Install necessary dependencies and clean up apt lists to reduce image size
RUN apt-get update && apt-get install -y --no-install-recommends \ 
        git \
        sudo \
        ca-certificates \
        curl \
        unzip \
        sqlite3 \
        tmux \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p ${CONFLUX_ROOT} /workspaces

# Set environment variables for chain IDs and configuration paths
ENV CONFLUX_ROOT=${CONFLUX_ROOT}
# Define build arguments for user creation
ARG USERNAME=ubuntu
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Add utility scripts and templates to the image

# Create a new user if $USERNAME doesn't exist
RUN id -u $USERNAME >/dev/null 2>&1 || (groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USERNAME -m -s /bin/bash $USERNAME)

# Configure passwordless sudo for the created user
RUN echo "$USERNAME ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Change ownership of the Conflux node directory to the created user
RUN chown -R ${USERNAME}:${USERNAME} ${CONFLUX_ROOT} /workspaces

# Expose necessary ports for the Conflux node
EXPOSE 12535 12537 8545 8546

# Switch to the created user context
USER $USERNAME 

FROM conflux AS devkit-vscode
 
# Set the working directory for the user
WORKDIR /workspaces/

# Set additional environment variables for the user
ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    EDITOR=code \
    VISUAL=code \
    GIT_EDITOR="code --wait"

FROM devkit-vscode AS devkit-deno
USER root
COPY --from=denoland/deno:bin-2.4.4 /deno /usr/local/bin/deno
USER $USERNAME 

FROM devkit-deno AS cfx-deno-cli
USER root
ADD . $CONFLUX_ROOT
RUN chown -R ${USERNAME}:${USERNAME} ${CONFLUX_ROOT}

USER $USERNAME

# Define a reusable Deno permissions command
ENV DENO_PERMISSIONS="deno --allow-env --allow-read --allow-write --allow-ffi --allow-net=127.0.0.1"
ENV CLI_PATH="${CONFLUX_ROOT}/src/cli.ts"

# Install Deno scripts
RUN cd $CONFLUX_ROOT && deno install --allow-scripts

# Add alias using the DENO_PERMISSIONS variable
RUN echo "alias devkit='${DENO_PERMISSIONS} ${CLI_PATH}'" >> ~/.bash_aliases

# Use DENO_PERMISSIONS in ENTRYPOINT
ENTRYPOINT ["/bin/bash", "-c", "$DENO_PERMISSIONS ${CLI_PATH} \"$@\"", "--"]
CMD ["start"]


USER root
RUN mkdir /opt/nvm
ENV NVM_DIR=/opt/nvm
ENV NODE_VERSION=v22.19.0
# nvm v0.40.3 is latest as of Sep 2025
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
RUN /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"
ENV NODE_PATH=$NVM_DIR/versions/node/$NODE_VERSION/bin
ENV PATH=$NODE_PATH:$PATH

FROM devkit-nvm AS devkit-hardhat
USER $USERNAME
# npm 11.6.0 is latest as of Sep 2025
RUN npm install -g npm@11.6.0
# pnpm 10.16.1 is latest as of Sep 2025
RUN npm install -g pnpm@10.16.1
# hardhat-shorthand 1.1.0 is latest as of Sep 2025
RUN npm install --global hardhat-shorthand@1.1.0
# hardhat-completion package does not exist on npm, skip install

FROM devkit-hardhat AS devkit-hardhat-core
RUN printf '%s\n' \
'if [ -t 0 ] && [ -z "${HARDHAT_VAR_DEPLOYER_ACCOUNT_CORE}" ]; then' \
'    HARDHAT_VAR_DEPLOYER_ACCOUNT_CORE=$(devkit wallet private-key --core)' \
'    if [ $? -eq 0 ] && [ -n "${HARDHAT_VAR_DEPLOYER_ACCOUNT_CORE}" ]; then' \
'        export HARDHAT_VAR_DEPLOYER_ACCOUNT_CORE' \
'    else' \
'        echo "Failed to retrieve mnemonic or mnemonic is empty" >&2' \
'    fi' \
'fi' >> /home/${USERNAME}/.bashrc
RUN echo "alias hardhat-var-update='export HARDHAT_VAR_DEPLOYER_ACCOUNT_CORE=\"\$(devkit wallet private-key --core)\"'" >> ~/.bash_aliases

FROM devkit-hardhat AS devkit-hardhat-espace
RUN printf '%s\n' \
'if [ -t 0 ] && [ -z "${HARDHAT_VAR_DEPLOYER_MNEMONIC}" ]; then' \
'    HARDHAT_VAR_DEPLOYER_MNEMONIC=$(devkit wallet show)' \
'    if [ $? -eq 0 ] && [ -n "${HARDHAT_VAR_DEPLOYER_MNEMONIC}" ]; then' \
'        export HARDHAT_VAR_DEPLOYER_MNEMONIC' \
'    else' \
'        echo "Failed to retrieve mnemonic or mnemonic is empty" >&2' \
'    fi' \
'fi' >> /home/${USERNAME}/.bashrc
RUN echo "alias hardhat-var-update='export HARDHAT_VAR_DEPLOYER_MNEMONIC=\"\$(devkit wallet show)\"'" >> ~/.bash_aliases
