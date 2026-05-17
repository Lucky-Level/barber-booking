// Barber Booking - Configuracao
const CONFIG = {
  // Supabase (projeto: instagram-post-generator / owkvgdjcobmuacnztzee)
  SUPABASE_URL: 'https://owkvgdjcobmuacnztzee.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93a3ZnZGpjb2JtdWFjbnp0emVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5OTkxNTQsImV4cCI6MjA5MTU3NTE1NH0.cvx4o9uFYOlVphl1_Sd8j8y-AxyCTi5xHxZHt0foyXI',

  // WhatsApp (numero sem + e sem espacos)
  WHATSAPP_NUMBER: '3530873470801',

  // Tolerancia de atraso (informativo pro cliente)
  LATE_TOLERANCE_MINUTES: 5,

  // Mensagem WhatsApp template
  // Variaveis: {name}, {phone}, {service}, {date}, {time}
  WHATSAPP_MESSAGE: 'Oi, agendei {service} para {date} as {time}. - {name}, {phone}'
};
