# -*- mode: ruby -*-
# vi: set ft=ruby :

require 'yaml'

vars = YAML.load_file("provisioning/vars.yml")
vagrant_vars = YAML.load_file("provisioning/vagrant-vars.yml")

app_name = vars["nodejs_app_name"]

app_directory = vagrant_vars["nodejs_app_install_dir"]

app_start_script = vars["nodejs_app_start_script"]

# Check for the existence of the 'VM_HOST_TCP_PORT' environment variable.
host_tcp_port = ENV["VM_HOST_TCP_PORT"] || 8091
# Connect to the application via nginx
guest_tcp_port = 443

# By default this VM will use 2 processor cores and 2GB of RAM. The 'VM_CPUS' and
# "VM_RAM" environment variables can be used to change that behaviour.
cpus = ENV["VM_CPUS"] || 2
ram = ENV["VM_RAM"] || 2048

Vagrant.configure(2) do |config|

  config.vm.box = "inclusivedesign/centos7"

  # Your working directory will be synced to the app_directory in the VM.
  config.vm.synced_folder ".", "#{app_directory}"

  # Mounts node_modules in /var/tmp to work around issues in the VirtualBox shared folders
  config.vm.provision "shell", run: "always", inline: <<-SHELL
    sudo mkdir -p /var/tmp/#{app_name}/node_modules #{app_directory}/node_modules
    sudo chown vagrant:vagrant -R /var/tmp/#{app_name}/node_modules #{app_directory}/node_modules
    sudo mount -o bind /var/tmp/#{app_name}/node_modules #{app_directory}/node_modules
  SHELL

  # List additional directories to sync to the VM in your "Vagrantfile.local" file
  # using the following format:
  # config.vm.synced_folder "../path/on/your/host/os/your-project", "/home/vagrant/sync/your-project"

  if File.exist? "Vagrantfile.local"
    instance_eval File.read("Vagrantfile.local"), "Vagrantfile.local"
  end

  # Port forwarding takes place here. The 'guest' port is used inside the VM
  # whereas the 'host' port is used by your host operating system.
  config.vm.network "forwarded_port", guest: guest_tcp_port, host: host_tcp_port, protocol: "tcp",
    auto_correct: true

  # Port 19531 is needed so logs can be viewed using systemd-journal-gateway
  #config.vm.network "forwarded_port", guest: 19531, host: 19531, protocol: "tcp",
  #  auto_correct: true

  config.vm.hostname = app_name

  config.vm.provider :virtualbox do |vm|
    vm.customize ["modifyvm", :id, "--memory", ram]
    vm.customize ["modifyvm", :id, "--cpus", cpus]
    vm.customize ["modifyvm", :id, "--vram", "256"]
    vm.customize ["modifyvm", :id, "--accelerate3d", "off"]
    vm.customize ["modifyvm", :id, "--audio", "null", "--audiocontroller", "ac97"]
    vm.customize ["modifyvm", :id, "--ioapic", "on"]
    vm.customize ["setextradata", "global", "GUI/SuppressMessages", "all"]
  end

  config.vm.provision "shell", inline: <<-SHELL
    sudo ansible-galaxy install -fr #{app_directory}/provisioning/requirements.yml
    sudo UNIVERSAL_VARS_FILE=vagrant-vars.yml PYTHONUNBUFFERED=1 ansible-playbook #{app_directory}/provisioning/playbook.yml --tags="install,configure,deploy" --inventory="localhost ansible_connection=local,"
    #yum -y install avahi-tools
  SHELL


  config.vm.network "public_network", bridge: "eno1"
end
