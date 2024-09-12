FROM ubuntu:focal
ARG TAGS
WORKDIR /root/
ARG DEBIAN_FRONTEND=noninteractive
RUN apt update && apt install -y software-properties-common && apt-add-repository -y ppa:ansible/ansible && apt-add-repository -y ppa:neovim-ppa/unstable && apt update && apt install -y curl git ansible build-essential neovim stow
RUN mkdir /root/dotfiles

WORKDIR /root/dotfiles

COPY . .
