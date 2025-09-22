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

  startListening() {
    if (!this.supabase) {
      console.error('Supabase client not available for real-time listening');
      return;
    }

    console.log(`Starting to listen for call signals for user: ${this.currentUserId}`);

    this.subscription = this.supabase
      .channel(`call_signals_${this.currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `to_user=eq.${this.currentUserId}`,
        },
        (payload) => {
          console.log('Received call signal:', payload);
          const signal = payload.new as CallSignal;
          
          if (signal && signal.signal_type && signal.from_user) {
            console.log(`Processing ${signal.signal_type} signal from ${signal.from_user}`);
            this.onSignalCallback?.(signal);
            
            // Clean up the signal after processing
            this.deleteSignal(signal.id);
          } else {
            console.error('Invalid signal received:', signal);
          }
        }
      )
      .subscribe((status) => {
        console.log('Call signals subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to call signals');
        } else if (status === 'CLOSED') {
          console.warn('Call signals subscription closed, attempting to reconnect...');
          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (!this.subscription || this.subscription.state === 'closed') {
              this.startListening();
            }
          }, 3000);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Call signals subscription error, retrying...');
          setTimeout(() => {
            this.startListening();
          }, 5000);
        }
      });
  }

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
