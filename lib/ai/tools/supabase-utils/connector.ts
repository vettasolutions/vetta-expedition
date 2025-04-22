/**
 * Supabase connector for accessing edge functions
 */

export class SupabaseConnector {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.authToken = process.env.SUPABASE_ANON_KEY || '';
  }

  async callFunction(
    functionPath: string,
    params: Record<string, any>
  ): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/functions/v1/${functionPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(params)
      }
    );
    
    return response.json();
  }
}

export const supabaseConnector = new SupabaseConnector('https://unwlycbkoyvfzhqfyvhk.supabase.co'); 