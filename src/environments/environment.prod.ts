export const environment = {
  production: true,
  // apiUrl vazio = URL relativa: requests vão para o mesmo host/porta do frontend.
  // O Nginx (ou proxy equivalente) encaminha /api/* para o backend.
  // Para deploy com domínios separados, preencha com a URL completa do backend (ex: https://api.exemplo.com).
  apiUrl: '',
  // actuatorUrl vazio = usa apiUrl como fallback (ver DevService.health()).
  // Em HML/prod o actuator costuma rodar na porta 8081 — configure via CI/CD se necessário.
  actuatorUrl: '',
  googleClientId: '',
  grafanaUrl: '',
  sentryDsn: '',
};
