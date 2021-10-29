FROM node

ENV USER=musica

# install python and make
RUN apt-get update && \
	apt-get install -y python3 build-essential bash
	
# create user accounts
RUN groupadd -r ${USER} && \
	useradd --create-home --home /home/musica -r -g ${USER} ${USER}
	
# set up volume and user
USER ${USER}
WORKDIR /home/musica

COPY package*.json ./
RUN npm install
VOLUME [ "/home/musica" ]

COPY . .

ENTRYPOINT [ "bash", "./CrashHandler.sh" ]