'use strict';

const Phone = {
    contacts: [],      // { id, name, unread, messages: [{from, text, time}] }
    activeContact: null,
    pendingMessages: [],

    init() {
        this.contacts = [];
        // Add player's own contact for system messages
        this.contacts.push({ id:'system', name:'📋 Journal', unread:0, messages:[
            { from:'system', text:"Welcome. Stay low, stay smart. Press [F] to open your phone.", time: GameState.gameMins },
        ]});
    },

    addContact(npc) {
        if (this.contacts.find(c => c.id === npc.id)) return;
        this.contacts.push({ id: npc.id, name: npc.name, unread: 0, messages: [], role: npc.role });
    },

    receiveMessage(contactId, text) {
        let contact = this.contacts.find(c => c.id === contactId);
        if (!contact) {
            const npc = NPCManager.getById(contactId);
            if (!npc) return;
            this.addContact(npc);
            contact = this.contacts.find(c => c.id === contactId);
        }
        contact.messages.push({ from: contactId, text, time: GameState.gameMins });
        if (this.activeContact !== contactId) {
            contact.unread++;
        }
        const name = contact.name;
        UI.notify(`📱 ${name}: "${text.slice(0, 40)}${text.length > 40 ? '…' : ''}"`, '#7e57c2');
    },

    sendMessage(contactId, text) {
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) return;
        contact.messages.push({ from:'player', text, time: GameState.gameMins });
        // Auto-reply from NPC
        setTimeout(() => this._npcReply(contactId), U.rng(3000, 8000));
    },

    _npcReply(contactId) {
        const npc = NPCManager.getById(contactId);
        if (!npc) return;
        const replies = {
            customer: [
                "Got anything good right now?",
                "How much you got on you?",
                "I need something this week.",
                "What strains you carrying?",
                "Hurry up, I'm waiting.",
            ],
            dealer: [
                "Supply's running low. Need a re-up.",
                "Sales are good. Need more product.",
                "When you coming through?",
                "Running out soon.",
            ],
        };
        const pool = replies[npc.role] || ["..."];
        this.receiveMessage(contactId, U.pick(pool));
    },

    addDealRecord(contactId, grams, value) {
        const contact = this.contacts.find(c => c.id === contactId);
        if (contact) {
            contact.messages.push({
                from: 'player',
                text: `[Deal: ${grams}g for ${U.money(value)}]`,
                time: GameState.gameMins,
            });
        }
    },

    open(contactId) {
        GameState.uiMode = 'phone';
        if (contactId) {
            this.activeContact = contactId;
            const c = this.contacts.find(c => c.id === contactId);
            if (c) c.unread = 0;
        } else {
            this.activeContact = this.contacts[0]?.id || null;
        }
    },

    close() {
        GameState.uiMode = 'playing';
        this.activeContact = null;
    },

    totalUnread() {
        return this.contacts.reduce((s, c) => s + c.unread, 0);
    },

    // ── Render the phone UI (canvas overlay) ─────────────────────────────
    draw(ctx) {
        if (GameState.uiMode !== 'phone') return;

        const pw = 580, ph = 520;
        const px = (CFG.W - pw) / 2;
        const py = (CFG.H - ph) / 2;

        // Phone body
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, 16);
        ctx.fill();
        ctx.strokeStyle = '#4a4a8a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Title bar
        ctx.fillStyle = '#16213e';
        ctx.fillRect(px, py, pw, 42);
        ctx.fillStyle = '#e2e2e2';
        ctx.font = 'bold 16px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('📱 PHONE', px + pw/2, py + 27);
        ctx.textAlign = 'left';

        // Close button
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(px + pw - 36, py + 8, 26, 26);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('✕', px + pw - 23, py + 26);
        ctx.textAlign = 'left';

        // Contact list (left pane)
        const listW = 180;
        ctx.fillStyle = '#0f3460';
        ctx.fillRect(px, py + 42, listW, ph - 42);

        ctx.font = 'bold 11px "Courier New"';
        ctx.fillStyle = '#90caf9';
        ctx.fillText('CONTACTS', px + 10, py + 60);

        for (let i = 0; i < this.contacts.length; i++) {
            const c  = this.contacts[i];
            const cy = py + 72 + i * 38;
            const isActive = c.id === this.activeContact;

            ctx.fillStyle = isActive ? '#1565c0' : (i % 2 === 0 ? '#0d2a50' : '#0a2244');
            ctx.fillRect(px, cy, listW, 36);

            ctx.fillStyle = isActive ? '#fff' : '#90caf9';
            ctx.font = (isActive ? 'bold ' : '') + '12px "Courier New"';
            ctx.fillText(c.name.slice(0, 14), px + 10, cy + 14);

            if (c.messages.length > 0) {
                const last = c.messages[c.messages.length - 1];
                ctx.fillStyle = '#607d8b';
                ctx.font = '9px "Courier New"';
                ctx.fillText(last.text.slice(0, 20) + (last.text.length > 20 ? '…' : ''), px + 10, cy + 28);
            }

            if (c.unread > 0) {
                ctx.fillStyle = '#f44336';
                ctx.beginPath();
                ctx.arc(px + listW - 16, cy + 12, 9, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px "Courier New"';
                ctx.textAlign = 'center';
                ctx.fillText(c.unread, px + listW - 16, cy + 16);
                ctx.textAlign = 'left';
            }

            // Click handler stored for game.js
            c._btnY = cy; c._btnH = 36;
        }

        // Message thread (right pane)
        const msgX = px + listW + 4;
        const msgW = pw - listW - 4;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(msgX, py + 42, msgW, ph - 42 - 50);

        const contact = this.contacts.find(c => c.id === this.activeContact);
        if (contact) {
            ctx.fillStyle = '#4a4a8a';
            ctx.fillRect(msgX, py + 42, msgW, 28);
            ctx.fillStyle = '#e2e2e2';
            ctx.font = 'bold 12px "Courier New"';
            ctx.fillText(contact.name, msgX + 8, py + 61);

            // Messages
            const msgArea = ph - 42 - 50 - 30;
            const msgs    = contact.messages.slice(-12);
            ctx.save();
            ctx.beginPath();
            ctx.rect(msgX, py + 72, msgW, msgArea);
            ctx.clip();

            let mY = py + 72 + 8;
            for (const msg of msgs) {
                const isPlayer = msg.from === 'player';
                const bubbleW  = msgW - 24;
                const lines    = U.wrapText(ctx, msg.text, bubbleW - 16);
                const bubbleH  = lines.length * 16 + 12;

                const bx = isPlayer ? msgX + msgW - bubbleW - 4 : msgX + 4;
                ctx.fillStyle = isPlayer ? '#1565c0' : '#263238';
                ctx.beginPath();
                ctx.roundRect(bx, mY, bubbleW, bubbleH, 8);
                ctx.fill();

                ctx.fillStyle = '#e2e2e2';
                ctx.font = '11px "Courier New"';
                for (let li = 0; li < lines.length; li++) {
                    ctx.fillText(lines[li], bx + 8, mY + 14 + li * 16);
                }

                ctx.fillStyle = '#607d8b';
                ctx.font = '9px "Courier New"';
                ctx.fillText(U.timeStr(msg.time), bx + 4, mY + bubbleH + 10);

                mY += bubbleH + 18;
            }
            ctx.restore();

            // Input bar
            const inputY = py + ph - 50;
            ctx.fillStyle = '#16213e';
            ctx.fillRect(msgX, inputY, msgW, 50);
            ctx.fillStyle = '#263238';
            ctx.fillRect(msgX + 6, inputY + 8, msgW - 80, 30);
            ctx.fillStyle = '#607d8b';
            ctx.font = '11px "Courier New"';
            ctx.fillText('Type a message... (feature coming)', msgX + 12, inputY + 28);

            // Send button
            ctx.fillStyle = '#1565c0';
            ctx.fillRect(msgX + msgW - 68, inputY + 8, 60, 30);
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText('Send', msgX + msgW - 38, inputY + 27);
            ctx.textAlign = 'left';
        }
    },

    handleClick(mx, my) {
        if (GameState.uiMode !== 'phone') return false;
        const pw = 580, ph = 520;
        const px = (CFG.W - pw) / 2;
        const py = (CFG.H - ph) / 2;

        // Close button
        if (mx > px + pw - 36 && mx < px + pw - 10 && my > py + 8 && my < py + 34) {
            this.close(); return true;
        }

        // Contact list
        for (const c of this.contacts) {
            if (c._btnY && mx > px && mx < px + 180 && my > c._btnY && my < c._btnY + 36) {
                this.activeContact = c.id;
                c.unread = 0;
                return true;
            }
        }
        return true; // consume all clicks in phone mode
    },
};
