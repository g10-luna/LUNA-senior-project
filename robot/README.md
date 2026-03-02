# LUNA Robot Setup (TurtleBot 4)

This guide installs everything needed for the LUNA robot stack on a **Linux device**: ROS 2, TurtleBot 4 packages, optional simulation, and tools to build the bridge.

---

## Your setup (laptop + robot)

You have **two devices**:

| Device | Role |
|--------|------|
| **Linux laptop** (this machine) | Development and offboard: edit code, run backend/dashboard, build the bridge, and (optionally) monitor the robot over the network. Install **Scenario B** below (ROS 2 Humble + TurtleBot 4 packages on Ubuntu 22.04). |
| **TurtleBot 4** (robot) | On-board Raspberry Pi runs ROS 2 and the LUNA bridge; it talks to the backend (on the laptop or a server) and drives the robot. Set up with **Scenario A** (official TurtleBot 4 setup script on the Pi’s Ubuntu image). |

Both need to be on the same network when you use the real robot. You can **develop and test in simulation on the laptop only** (Gazebo + ROS 2 + bridge pointing at local backend) and **connect to the physical TurtleBot 4 only when you need it** (e.g. integration tests or demos).

---

## Choose your scenario

| Scenario | This device is… | What you need |
|----------|------------------|----------------|
| **A. On-robot (Raspberry Pi)** | The computer on the TurtleBot 4 | ROS 2 Jazzy + TurtleBot 4 (official script) |
| **B. Dev / simulation (PC or VM)** | A development machine (no robot hardware) | ROS 2 + TurtleBot 4 packages + optional Gazebo |

Use **A** if this Linux device will run on the physical robot. Use **B** if you're developing or running simulation only.

---

## Prerequisites (both scenarios)

- **OS:** Ubuntu 22.04 (64-bit) or 24.04 (64-bit). Other Debian-based distros may work with adjustments.
- **Network:** Internet access for packages.
- **User:** You’ll run commands as a normal user; `sudo` only when indicated.

---

## Scenario A: This Linux device IS the robot (e.g. Raspberry Pi on TurtleBot 4)

Official TurtleBot 4 setup (run on **Ubuntu 22.04 Server** or **24.04 Server** on the Pi):

**Ubuntu 22.04 (Humble):**
```bash
wget -qO- https://raw.githubusercontent.com/turtlebot/turtlebot4_setup/humble/scripts/turtlebot4_setup.sh | bash
```

**Ubuntu 24.04 (Jazzy):**
```bash
wget -qO- https://raw.githubusercontent.com/turtlebot/turtlebot4_setup/jazzy/scripts/turtlebot4_setup.sh | bash
```

Then reboot and run:
```bash
sudo reboot
# after reboot:
turtlebot4-setup
```

- **Create® 3 base:** For Jazzy, firmware must be **I.\*.\*** or later.
- **Docs:** [TurtleBot 4 User Manual – Basic Setup](https://turtlebot.github.io/turtlebot4-user-manual/setup/basic.html)

---

## Scenario B: Development / simulation machine (no robot hardware)

Install ROS 2 and TurtleBot 4 packages so you can develop the bridge and run simulation (e.g. Ignition Gazebo) without the physical robot.

### 1. Set locale

```bash
sudo apt update && sudo apt install -y locales
sudo locale-gen en_US en_US.UTF-8
sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
export LANG=en_US.UTF-8
```

### 2. Add ROS 2 apt repo

**Ubuntu 22.04 (ROS 2 Humble) — use this on Jammy:**

```bash
sudo apt install -y software-properties-common
sudo add-apt-repository -y universe
sudo apt update && sudo apt install -y curl
sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key -o /usr/share/keyrings/ros-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) main" | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null
sudo apt update
```

**Ubuntu 24.04 (ROS 2 Jazzy):** Use the same repo; then install `ros-jazzy-*` and `ros-jazzy-turtlebot4-*` packages instead of `ros-humble-*` below.

### 3. Install ROS 2 (desktop) + build tools

**Ubuntu 22.04 (Humble):**
```bash
sudo apt install -y ros-humble-desktop
sudo apt install -y python3-colcon-common-extensions python3-rosdep2
```

**Ubuntu 24.04 (Jazzy):**
```bash
sudo apt install -y ros-jazzy-desktop
sudo apt install -y python3-colcon-common-extensions python3-rosdep2
```

### 4. Install TurtleBot 4 packages

**Ubuntu 22.04 (Humble) — correct package names:**
```bash
sudo apt install -y ros-humble-turtlebot4-setup ros-humble-turtlebot4-robot ros-humble-irobot-create-control ros-humble-turtlebot4-navigation
```

**Ubuntu 24.04 (Jazzy):**
```bash
sudo apt install -y ros-jazzy-turtlebot4-setup ros-jazzy-turtlebot4-robot ros-jazzy-irobot-create-control ros-jazzy-turtlebot4-navigation
```

Optional (for simulation): check [TurtleBot 4 simulation docs](https://turtlebot.github.io/turtlebot4-user-manual/software/simulation.html) for your distro; package names may vary.

### 5. Source ROS 2 in every new shell

**Humble (22.04):**
```bash
echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc
source ~/.bashrc
```

**Jazzy (24.04):** use `/opt/ros/jazzy/setup.bash` instead.

### 6. Verify

**Humble:**
```bash
source /opt/ros/humble/setup.bash
ros2 pkg list | grep turtlebot4
```
**Jazzy:** use `source /opt/ros/jazzy/setup.bash` instead.

You should see TurtleBot 4 packages listed.

---

## Python and bridge (both scenarios)

The LUNA **bridge** (backend–robot communication) will be Python. Ensure Python 3.10+ and `pip` are available:

```bash
python3 --version
sudo apt install -y python3-pip python3-venv
```

For the bridge you’ll need at least:

- `requests` or `httpx` (to poll backend and POST status)
- ROS 2 Python client: `ros2` CLI is installed with ROS 2; for Python nodes use the `rclpy` package (included in `ros-jazzy-desktop` when installed)

Creating a small venv for the bridge (optional but recommended):

```bash
cd /home/howard/Documents/LUNA-senior-project
python3 -m venv .venv-robot
source .venv-robot/bin/activate
pip install --upgrade pip
pip install httpx
# When the bridge code exists:
# pip install -r robot/bridge/requirements.txt
```

---

## Optional: Ignition Gazebo simulation (Scenario B)

If you installed simulation packages:

- Follow [TurtleBot 4 User Manual – Simulation](https://turtlebot.github.io/turtlebot4-user-manual/software/simulation.html) for your distro (Humble/Jazzy).
- Typically you’ll launch a Gazebo world and the TurtleBot 4 sim, then run your nodes in another terminal with `source /opt/ros/jazzy/setup.bash`.

---

## Summary checklist

- [ ] **Scenario A (on-robot):** Run `turtlebot4_setup.sh` → reboot → `turtlebot4-setup`
- [ ] **Scenario B (dev/sim):** Install ROS 2 Jazzy → TurtleBot 4 packages → source `setup.bash` in each shell
- [ ] **Both:** Python 3.10+ and `pip`; optional venv for the bridge
- [ ] **Verify:** `ros2 pkg list | grep turtlebot4` shows packages

After this, you can build the LUNA `robot/` workspace (e.g. `ros2_ws` and `bridge/`) and point the bridge at your backend (Docker or dev server).
