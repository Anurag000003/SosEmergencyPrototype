import { meshProtocol, MeshPacket } from "./meshProtocol";

export interface MeshPeer {
  id: string;
  name: string;
  isHealthWorker: boolean;
  isDoctor: boolean;
  rssi: number;
  lastSeen: number;
}

class BluetoothMeshService {
  private myId: string = `peer_${Math.random().toString(36).substr(2, 9)}`;
  private myName: string = "User";
  private isHealthWorker: boolean = false;
  private isDoctor: boolean = false;

  private connectedPeers: Map<string, MeshPeer> = new Map();
  private listeners: Set<(peers: MeshPeer[]) => void> = new Set();
  private packetListeners: Set<(packet: MeshPacket) => void> = new Set();
  private intervalId: any = null;

  public initialize(
    userId: string,
    userName: string,
    isHealthWorker: boolean = false,
    isDoctor: boolean = false
  ) {
    this.myId = userId;
    this.myName = userName;
    this.isHealthWorker = isHealthWorker;
    this.isDoctor = isDoctor;

    this.startMeshEngine();
  }

  public updateIdentity(isHealthWorker: boolean, isDoctor: boolean) {
    this.isHealthWorker = isHealthWorker;
    this.isDoctor = isDoctor;
    console.log(`[MeshService] Identity updated: HW=${isHealthWorker}, MD=${isDoctor}`);
  }

  public subscribeToPeers(callback: (peers: MeshPeer[]) => void) {
    this.listeners.add(callback);
    callback(Array.from(this.connectedPeers.values()));
    return () => this.listeners.delete(callback);
  }

  public subscribeToPackets(callback: (packet: MeshPacket) => void) {
    this.packetListeners.add(callback);
    return () => this.packetListeners.delete(callback);
  }

  /**
   * Broadcasts an emergency SOS packet over the mesh network.
   */
  public broadcastEmergencyPacket(message: string, hasMedia: boolean): MeshPacket {
    const recipientType = this.isDoctor ? "BROADCAST" : this.isHealthWorker ? "DOCTOR" : "HEALTH_WORKER";
    const packet = meshProtocol.generatePacket(this.myId, this.myName, message, recipientType, hasMedia);
    
    console.log(`[MeshService] Dispatching emergency SOS packet: ${packet.packetId} target: ${recipientType}`);
    
    // Simulate immediate relay to connected peers
    this.simulateRelayOutput(packet);
    
    return packet;
  }

  private startMeshEngine() {
    if (this.intervalId) clearInterval(this.intervalId);

    // Simulate scanning and discovery of peers in BLE range
    this.intervalId = setInterval(() => {
      this.simulatePeerDiscovery();
    }, 4000);
  }

  private simulatePeerDiscovery() {
    const names = ["Dr. Sharma", "Health Worker Priya", "Community Clinic Node", "Nurse Amit", "Patient B"];
    const now = Date.now();

    // Randomly update RSSI and add/remove peers
    names.forEach((name) => {
      const isHW = name.includes("Health Worker") || name.includes("Clinic") || name.includes("Nurse");
      const isDoc = name.includes("Dr.");
      const peerId = `peer_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

      if (Math.random() > 0.3) {
        const peer: MeshPeer = {
          id: peerId,
          name,
          isHealthWorker: isHW,
          isDoctor: isDoc,
          rssi: -50 - Math.floor(Math.random() * 40),
          lastSeen: now,
        };
        this.connectedPeers.set(peerId, peer);
      } else {
        // Peer walks out of range
        this.connectedPeers.delete(peerId);
      }
    });

    this.notifyPeersChanged();
  }

  private simulateRelayOutput(packet: MeshPacket) {
    // Send to all connected peers simulation
    this.connectedPeers.forEach((peer) => {
      console.log(`[MeshService] Transmission: Relay packet ${packet.packetId} -> ${peer.name} (RSSI: ${peer.rssi}dBm)`);
      
      // If the peer is a medical node and recipient matches, mark it delivered in simulation
      if (
        (packet.recipientType === "HEALTH_WORKER" && peer.isHealthWorker) ||
        (packet.recipientType === "DOCTOR" && peer.isDoctor)
      ) {
        console.log(`[MeshService] Emergency Packet delivered to target health responder node: ${peer.name}`);
      }
    });
  }

  private notifyPeersChanged() {
    const peerList = Array.from(this.connectedPeers.values());
    this.listeners.forEach((listener) => listener(peerList));
  }

  public getConnectedPeers(): MeshPeer[] {
    return Array.from(this.connectedPeers.values());
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const bluetoothMeshService = new BluetoothMeshService();
