@echo off
echo Verificando se o servidor ja esta rodando na porta 5173...

netstat -ano | findstr :5173 > nul
if %errorlevel% == 0 (
    echo O servidor ja esta rodando! Abrindo o navegador...
    start http://localhost:5173
) else (
    echo Servidor nao detectado. Iniciando agora...
    echo (Esta janela ficara aberta enquanto o servidor estiver rodando)
    npm run dev
)
