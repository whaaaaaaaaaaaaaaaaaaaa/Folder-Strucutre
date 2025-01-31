// WebSocket manager
class WebSocketManager {
  private clients: Set<WebSocket> = new Set();

  addClient(ws: WebSocket) {
    this.clients.add(ws);
    ws.onclose = () => {
      this.clients.delete(ws);
    };
  }

  broadcast(message: any) {
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  notifyRefresh() {
    this.broadcast({ type: 'refresh' });
  }

  notifyComment(itemId: number) {
    this.broadcast({ type: 'comment', itemId });
  }
}

export const wsManager = new WebSocketManager();
