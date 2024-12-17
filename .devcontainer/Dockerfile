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
COPY --from=denoland/deno:bin-2.1.4 /deno /usr/local/bin/deno
USER $USERNAME 

FROM devkit-deno AS cfx-deno-cli
USER root
ADD . $CONFLUX_ROOT
RUN chown -R ${USERNAME}:${USERNAME} ${CONFLUX_ROOT}

USER $USERNAME
RUN cd $CONFLUX_ROOT && deno install --allow-scripts
RUN echo "alias devkit='deno --allow-env --allow-read --allow-write --allow-ffi --allow-net=127.0.0.1 /opt/conflux/src/cli.ts'" >> ~/.bash_aliases

ENTRYPOINT ["/bin/bash", "-c", "/usr/local/bin/deno --allow-env --allow-read --allow-write --allow-ffi --allow-net=127.0.0.1 ${CONFLUX_ROOT}/src/cli.ts \"$@\"", "--"]
CMD ["start"]
