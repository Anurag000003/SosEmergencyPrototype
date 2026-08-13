export interface MeshPacket {
  packetId: string;
  senderId: string;
  senderName: string;
  recipientType: "BROADCAST" | "HEALTH_WORKER" | "DOCTOR";
  ttl: number;
  hops: string[];
  payload: {
    message: string;
    hasMedia: boolean;
    timestamp: number;
  };
  timestamp: number;
}

class MeshProtocolManager {
  private seenCache: Set<string> = new Set();
  private maxCacheSize = 1000;

  public generatePacket(
    senderId: string,
    senderName: string,
    message: string,
    recipientType: "BROADCAST" | "HEALTH_WORKER" | "DOCTOR" = "BROADCAST",
    hasMedia: boolean = false
  ): MeshPacket {
    const packet: MeshPacket = {
      packetId: `${senderId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderId,
      senderName,
      recipientType,
      ttl: 7,
      hops: [senderId],
      payload: {
        message,
        hasMedia,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };
    
    // Add to seen cache so we don't process our own packet if received back
    this.markSeen(packet.packetId);
    return packet;
  }

  public markSeen(packetId: string): void {
    if (this.seenCache.size >= this.maxCacheSize) {
      const firstKey = this.seenCache.values().next().value;
      if (firstKey !== undefined) {
        this.seenCache.delete(firstKey);
      }
    }
    this.seenCache.add(packetId);
  }

  public isDuplicate(packetId: string): boolean {
    return this.seenCache.has(packetId);
  }

  /**
   * Processes an incoming packet for relaying.
   * If TTL > 0 and it's not a duplicate, returns a new packet copy with decremented TTL.
   */
  public processRelay(packet: MeshPacket, myPeerId: string): MeshPacket | null {
    if (this.isDuplicate(packet.packetId)) {
      return null;
    }

    this.markSeen(packet.packetId);

    if (packet.ttl <= 1) {
      console.log(`[MeshProtocol] Packet ${packet.packetId} TTL expired.`);
      return null;
    }

    if (packet.hops.includes(myPeerId)) {
      console.log(`[MeshProtocol] Loop detected. Already hopped through us.`);
      return null;
    }

    return {
      ...packet,
      ttl: packet.ttl - 1,
      hops: [...packet.hops, myPeerId],
    };
  }
}

export const meshProtocol = new MeshProtocolManager();
