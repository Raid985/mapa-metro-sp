const fs = require('fs');

async function atualizarDados() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY nao configurada.');

  const dadosAtuais = fs.readFileSync('dados.json', 'utf8');
  const hoje = new Date().toISOString().slice(0, 10);

  const prompt = 'Voce e um especialista em transporte ferroviario de Sao Paulo. Com base nas informacoes mais recentes das obras e operacoes das linhas do Metro, CPTM, ViaQuatro, ViaMobilidade, Linha Uni, Trivia Trens, TIC Trens e Trens Intercidades (TIC) de Sao Paulo ate ' + hoje + ', atualize o JSON abaixo movendo estacoes inauguradas para "op", estacoes com obras iniciadas para "build", atualizando porcentagens ("buildPct", "projectPct"), notas ("note") e mudando "DATA_ATUALIZACAO" para "' + hoje + '". Mantenha EXATAMENTE a mesma estrutura e chaves do JSON original. Responda APENAS com o JSON valido, sem crases markdown ou explicacoes.\n\nJSON ATUAL:\n' + dadosAtuais;

  const host = 'generativelanguage' + '.googleapis.com';
  const base = 'https://' + host + '/v1beta/models/';
  const modelo = 'gemini-3.8-flash-lite:generateContent';
  const url = base + modelo + '?key=' + apiKey;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    throw new Error('Erro na API Gemini: ' + response.status + ' ' + await response.text());
  }

  const data = await response.json();
  const candidato = data.candidates.at(0);
  const parte = candidato.content.parts.at(0);
  let textoResposta = parte.text.replace(/```json/g, '').replace(/```/g, '').trim();

  const jsonValidado = JSON.parse(textoResposta);
  fs.writeFileSync('dados.json', JSON.stringify(jsonValidado, null, 2), 'utf8');
  console.log('dados.json atualizado com sucesso para', hoje);
}

atualizarDados().catch(err => {
  console.error(err);
  process.exit(1);
});
