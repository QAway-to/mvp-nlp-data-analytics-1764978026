import { useState, useEffect } from 'react';
import FileUploader from '../src/components/FileUploader';
import ChatInterface from '../src/components/ChatInterface';
import DataTable from '../src/components/DataTable';
import ChartPanel from '../src/components/ChartPanel';
import sampleData from '../src/mock-data/sample';

// Стили для скроллбара (современный вид)
const scrollbarStyles = `
  /* Webkit (Chrome, Safari, Edge) */
  *::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  *::-webkit-scrollbar-track {
    background: #11162a;
    border-radius: 4px;
  }
  *::-webkit-scrollbar-thumb {
    background: #3b82f6;
    border-radius: 4px;
  }
  *::-webkit-scrollbar-thumb:hover {
    background: #2563eb;
  }
  /* Firefox */
  * {
    scrollbar-width: thin;
    scrollbar-color: #3b82f6 #11162a;
  }
`;

const container = {
  fontFamily: 'Inter, sans-serif',
  padding: '24px 32px',
  background: '#0f172a',
  color: '#f8fafc',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column'
};

const header = {
  marginBottom: 32,
  flexShrink: 0
};

// Верхний ряд: 3 колонки фиксированной высоты
const topRowStyle = (isMobile = false) => ({
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
  gap: 24,
  marginBottom: 24,
  minHeight: 0,
  height: isMobile ? 'auto' : '400px' // Фиксированная высота для верхнего ряда
});

const section = {
  background: '#1e1f33',
  borderRadius: 16,
  padding: 24,
  border: '1px solid rgba(59,130,246,0.2)',
  boxShadow: '0 20px 35px rgba(15, 23, 42, 0.35)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0, // Важно для работы overflow
  overflow: 'hidden' // Предотвращаем выход контента за границы
};

// Внутренний контейнер для скролла внутри секции
const sectionContent = {
  flex: '1 1 auto',
  overflowY: 'auto',
  overflowX: 'hidden',
  minHeight: 0
};

const info = {
  marginTop: 16,
  padding: 12,
  background: 'rgba(16, 185, 129, 0.1)',
  borderRadius: 8,
  color: '#10b981',
  fontSize: 14
};

const results = {
  marginTop: 32
};

// Функция для форматирования ответа LLM
function formatLLMResponse(text) {
  if (!text) return '';
  
  // Разбиваем на параграфы
  const paragraphs = text.split('\n\n');
  
  return paragraphs.map((para, idx) => {
    const trimmed = para.trim();
    if (!trimmed) return null;
    
    // Заголовки (начинаются с ** или цифры с точкой)
    if (trimmed.match(/^\*\*.*\*\*$/) || trimmed.match(/^\d+\.\s+\*\*/)) {
      return (
        <h3 key={idx} style={{ 
          color: '#f8fafc', 
          fontSize: 18, 
          fontWeight: 600, 
          marginTop: idx > 0 ? 20 : 0,
          marginBottom: 12,
          borderLeft: '3px solid #6366f1',
          paddingLeft: 12
        }}>
          {trimmed.replace(/\*\*/g, '')}
        </h3>
      );
    }
    
    // Списки (начинаются с -, *, или цифры)
    if (trimmed.match(/^[-*•]\s/) || trimmed.match(/^\d+\.\s/)) {
      const items = trimmed.split('\n').filter(line => line.trim());
      return (
        <ul key={idx} style={{ 
          marginTop: idx > 0 ? 16 : 0, 
          marginBottom: 16,
          paddingLeft: 24,
          listStyle: 'none'
        }}>
          {items.map((item, itemIdx) => {
            const cleanItem = item.replace(/^[-*•]\s/, '').replace(/^\d+\.\s/, '').trim();
            return (
              <li key={itemIdx} style={{ 
                marginBottom: 8,
                position: 'relative',
                paddingLeft: 20
              }}>
                <span style={{ 
                  position: 'absolute',
                  left: 0,
                  color: '#6366f1'
                }}>•</span>
                <span>{cleanItem}</span>
              </li>
            );
          })}
        </ul>
      );
    }
    
    // Выделение жирным текстом
    const parts = trimmed.split(/(\*\*.*?\*\*)/g);
    const formatted = parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={partIdx} style={{ color: '#f8fafc', fontWeight: 600 }}>
            {part.replace(/\*\*/g, '')}
          </strong>
        );
      }
      return part;
    });
    
    // Код (в обратных кавычках)
    const codeParts = [];
    let currentIndex = 0;
    formatted.forEach((part, partIdx) => {
      if (typeof part === 'string') {
        const codeMatches = part.match(/`([^`]+)`/g);
        if (codeMatches) {
          let lastIndex = 0;
          codeMatches.forEach(match => {
            const matchIndex = part.indexOf(match, lastIndex);
            if (matchIndex > lastIndex) {
              codeParts.push(part.substring(lastIndex, matchIndex));
            }
            codeParts.push(
              <code key={`code-${partIdx}-${currentIndex++}`} style={{
                background: 'rgba(99, 102, 241, 0.2)',
                padding: '2px 6px',
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
                color: '#a78bfa'
              }}>
                {match.replace(/`/g, '')}
              </code>
            );
            lastIndex = matchIndex + match.length;
          });
          if (lastIndex < part.length) {
            codeParts.push(part.substring(lastIndex));
          }
        } else {
          codeParts.push(part);
        }
      } else {
        codeParts.push(part);
      }
    });
    
    return (
      <p key={idx} style={{ 
        marginTop: idx > 0 ? 16 : 0, 
        marginBottom: 0,
        color: 'inherit'
      }}>
        {codeParts.length > 0 ? codeParts : formatted}
      </p>
    );
  }).filter(Boolean);
}

export default function Home() {
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [queryHistory, setQueryHistory] = useState([]);

  // Определение мобильного устройства
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Загрузка истории запросов из localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('queryHistory');
    if (savedHistory) {
      try {
        setQueryHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error loading query history:', e);
      }
    }
  }, []);

  // Сохранение истории запросов
  const saveToHistory = (query, result) => {
    const historyItem = {
      id: Date.now(),
      query,
      timestamp: new Date().toISOString(),
      resultType: result?.type || 'text',
      hasChart: !!result?.chart,
      hasTable: !!result?.table
    };
    
    const newHistory = [historyItem, ...queryHistory.slice(0, 19)]; // Последние 20 запросов
    setQueryHistory(newHistory);
    localStorage.setItem('queryHistory', JSON.stringify(newHistory));
  };

  // Повтор запроса из истории
  const repeatQuery = (historyItem) => {
    setQuery(historyItem.query);
    handleQuerySubmit(historyItem.query);
  };

  // Load sample data on mount for demo (only if no data uploaded)
  useEffect(() => {
    const savedData = sessionStorage.getItem('uploadedData');
    if (!savedData && !data) {
      setData({
        rows: sampleData.length,
        columns: Object.keys(sampleData[0] || {}).length,
        sample: sampleData.slice(0, 5),
        columnNames: Object.keys(sampleData[0] || {}),
        data: sampleData
      });
    } else if (savedData) {
      const parsedData = JSON.parse(savedData);
      const columns = JSON.parse(sessionStorage.getItem('uploadedColumns') || '[]');
      setData({
        rows: parsedData.length,
        columns: columns.length,
        sample: parsedData.slice(0, 5),
        columnNames: columns,
        data: parsedData
      });
    }
  }, []);

  const handleDataLoaded = (loadedData) => {
    setData(loadedData);
    if (loadedData.logs && loadedData.logs.length > 0) {
      setLogs(loadedData.logs);
    }
  };

  const handleQuerySubmit = async (q) => {
    if (!q.trim()) return;
    
    // Get data from state or sessionStorage
    let currentData = data?.data;
    let currentColumns = data?.columnNames;

    if (!currentData) {
      const savedData = sessionStorage.getItem('uploadedData');
      if (savedData) {
        currentData = JSON.parse(savedData);
        currentColumns = JSON.parse(sessionStorage.getItem('uploadedColumns') || '[]');
      } else {
        // Use sample data
        currentData = sampleData;
        currentColumns = Object.keys(sampleData[0] || {});
      }
    }

    if (!currentData || currentData.length === 0) {
      setResults({
        type: 'error',
        message: 'Сначала загрузите данные',
        table: null,
        chart: null
      });
      setLogs([{ timestamp: new Date().toISOString(), message: '❌ ОШИБКА: Нет данных для анализа' }]);
      return;
    }
    
    setLoading(true);
    setLogs([{ timestamp: new Date().toISOString(), message: 'Начало обработки запроса...' }]);
    
    try {
      console.log('[Query] Отправка запроса:', q);
      console.log('[Query] Данные:', currentData?.length, 'строк');
      console.log('[Query] Колонки:', currentColumns);
      
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: q,
          data: currentData,
          columns: currentColumns
        })
      });

      console.log('[Query] Ответ получен, статус:', response.status);
      const result = await response.json();
      console.log('[Query] Результат:', result);
      console.log('[Query] Логи из ответа:', result.logs);

      if (!response.ok) {
        console.error('[Query] Ошибка ответа:', result);
        console.error('[Query] Детали ошибки:', result.details);
        console.error('[Query] Stack trace:', result.stack);
        
        // Build detailed error message
        let errorMessage = result.error || result.message || 'Ошибка обработки запроса';
        if (result.details) {
          errorMessage += `\n\nДетали:\n${JSON.stringify(result.details, null, 2)}`;
          if (result.details.suggestion) {
            errorMessage += `\n\n💡 Решение: ${result.details.suggestion}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      setResults(result);
      
      // Сохраняем в историю
      saveToHistory(q, result);
      
      // Show logs if available
      if (result.logs && result.logs.length > 0) {
        setLogs(result.logs);
      }
    } catch (error) {
      console.error('[Query] Ошибка:', error);
      console.error('[Query] Error stack:', error.stack);
      
      const errorMessage = error.message || 'Ошибка обработки запроса';
      
      setResults({
        type: 'error',
        message: errorMessage,
        table: null,
        chart: null,
        logs: logs,
        errorDetails: error.stack
      });
      
      setLogs(prev => [
        ...prev, 
        { 
          timestamp: new Date().toISOString(), 
          message: `❌ ОШИБКА: ${errorMessage}` 
        },
        {
          timestamp: new Date().toISOString(),
          message: `Детали: ${error.stack?.substring(0, 500) || 'Нет дополнительной информации'}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={container}>
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      <header style={header}>
        <h1 style={{ fontSize: 36, margin: 0 }}>📊 NLP Data Analytics</h1>
        <p style={{ color: '#94a3b8', marginTop: 8 }}>
          Анализ данных через естественный язык. Загрузите CSV/Excel или подключите БД.
        </p>
      </header>

      {/* Верхний ряд: 3 колонки фиксированной высоты */}
      <div style={topRowStyle(isMobile)}>
        {/* Левая колонка: Загрузка данных */}
        <section style={section}>
          <h2 style={{ marginTop: 0, marginBottom: 16, flexShrink: 0 }}>📁 Загрузка данных</h2>
          <div style={sectionContent}>
            <FileUploader onDataLoaded={handleDataLoaded} />
            {data && (
              <>
                <div style={info}>
                  ✅ Загружено: {data.rows} строк, {data.columns} колонок
                </div>
                {data.missingValues && Object.keys(data.missingValues).length > 0 && (
                  <div style={{ marginTop: 12, padding: 12, background: 'rgba(251, 191, 36, 0.1)', borderRadius: 8, fontSize: 12 }}>
                    <div style={{ color: '#fbbf24', fontWeight: 600, marginBottom: 8 }}>⚠️ Пропущенные значения:</div>
                    {Object.entries(data.missingValues)
                      .filter(([_, info]) => info.count > 0)
                      .slice(0, 5)
                      .map(([col, info]) => (
                        <div key={col} style={{ color: '#fbbf24', marginBottom: 4, fontSize: 11 }}>
                          {col}: {info.count} ({info.percentage}%)
                        </div>
                      ))}
                    {Object.values(data.missingValues).filter(info => info.count > 0).length > 5 && (
                      <div style={{ color: '#fbbf24', fontSize: 11, marginTop: 4 }}>
                        ... и ещё {Object.values(data.missingValues).filter(info => info.count > 0).length - 5} колонок
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {!data && (
              <div style={{ marginTop: 16, padding: 12, background: '#11162a', borderRadius: 8, fontSize: 12, color: '#94a3b8' }}>
                💡 <strong>Демо режим:</strong> Используются примерные данные для демонстрации. Загрузите свой файл для реального анализа.
              </div>
            )}
          </div>
        </section>

        {/* Средняя колонка: Задайте вопрос */}
        <section style={section}>
          <h2 style={{ marginTop: 0, marginBottom: 16, flexShrink: 0 }}>💬 Задайте вопрос</h2>
          <div style={sectionContent}>
            <ChatInterface 
              query={query}
              onQueryChange={setQuery}
              onQuerySubmit={handleQuerySubmit}
              loading={loading}
            />
            <div style={{ marginTop: 16, fontSize: 12, color: '#94a3b8' }}>
              Примеры: "покажи средние продажи", "создай график тренда", "найди аномалии"
            </div>
          </div>
        </section>

        {/* Правая колонка: Логи обработки */}
        <section style={section}>
          <h2 style={{ marginTop: 0, marginBottom: 16, flexShrink: 0 }}>📝 Логи обработки</h2>
          <div style={sectionContent}>
            {logs.length > 0 ? (
              <div style={{
                fontFamily: 'monospace',
                fontSize: 12
              }}>
                {logs.map((log, idx) => (
                  <div key={idx} style={{ 
                    marginBottom: 8, 
                    color: log.message.includes('ОШИБКА') || log.message.includes('❌') ? '#ef4444' : '#94a3b8',
                    whiteSpace: 'pre-wrap'
                  }}>
                    <span style={{ color: '#6366f1' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    {' '}
                    {log.message}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                💡 Логи обработки появятся здесь после отправки запроса
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Нижний ряд: Результаты анализа (на всю ширину) */}
      {(results && (results.chart || results.table)) && (
        <section style={{ ...section, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>📊 Результаты анализа</h2>
          {loading && (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 14 }}>⏳ Обработка запроса...</div>
            </div>
          )}
          
          {!loading && results.chart && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16, color: '#f8fafc' }}>📈 Визуализация</h3>
              <ChartPanel data={results.chart} />
            </div>
          )}
          
          {!loading && results.table && (
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16, color: '#f8fafc' }}>📋 Данные</h3>
              <div style={{ overflowX: 'auto' }}>
                <DataTable data={results.table} />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Нижний ряд: Ответ от LLM (на всю ширину) */}
      {results && results.message && (
        <section style={section}>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>💬 Ответ от LLM</h2>
          <div style={{
            color: results.type === 'error' ? '#ef4444' : '#e2e8f0',
            whiteSpace: 'pre-wrap',
            fontFamily: results.type === 'error' ? 'monospace' : 'inherit',
            fontSize: results.type === 'error' ? 12 : 15,
            lineHeight: 1.8,
            wordBreak: 'break-word',
            padding: results.type === 'error' ? 16 : 20,
            background: results.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.05)',
            borderRadius: 12,
            border: results.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.2)'
          }}>
            {formatLLMResponse(results.message)}
          </div>
          {results.type === 'error' && results.errorDetails && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>
                Показать технические детали
              </summary>
              <pre style={{
                marginTop: 8,
                padding: 12,
                background: '#11162a',
                borderRadius: 8,
                color: '#ef4444',
                fontSize: 11,
                overflow: 'auto',
                maxHeight: 200
              }}>
                {results.errorDetails}
              </pre>
            </details>
          )}
        </section>
      )}
    </main>
  );
}

