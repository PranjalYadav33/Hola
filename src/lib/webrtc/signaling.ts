import { getSupabaseClient } from "@/lib/supabaseClient";

export type SignalType = 'offer' | 'answer' | 'ice-candidate' | 'call-request' | 'call-accept' | 'call-reject' | 'end-call';

export interface CallSignal {
  id: string;
  from_user: string;
  to_user: string;
  signal_type: SignalType;
  signal_data: any;
  conversation_id: string;
  created_at: string;
}

export class SignalingService {
  private supabase = getSupabaseClient();
  private currentUserId: string;
  private onSignalCallback?: (signal: CallSignal) => void;
  private subscription: any;

  constructor(userId: string) {
    this.currentUserId = userId;
  }

  async sendSignal(
    toUserId: string, 
    conversationId: string, 
    type: SignalType, 
    data: any
  ) {
    if (!this.supabase) return;

    const signal = {
      from_user: this.currentUserId,
      to_user: toUserId,
      signal_type: type,
      signal_data: data,
      conversation_id: conversationId,
    };

    const { error } = await this.supabase
      .from('call_signals')
      .insert(signal);

    if (error) {
      console.error('Error sending signal:', error);
    }
  }

  startListening(onSignal: (signal: CallSignal) => void): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    const channelName = `call-signals-${this.userId}-${Date.now()}`;
    this.subscription = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `to_user=eq.${this.userId}`,
        },
        (payload: any) => {
          const signal = payload.new as CallSignal;
          onSignal(signal);
        }
      )
      .subscribe();

  stopListening() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  onSignal(callback: (signal: CallSignal) => void) {
    this.onSignalCallback = callback;
  }

  private async deleteSignal(signalId: string) {
    if (!this.supabase) return;
    
    await this.supabase
      .from('call_signals')
      .delete()
      .eq('id', signalId);
  }
}
