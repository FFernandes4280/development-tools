/**
 * Prettifies a JSON string.
 * @param {string} jsonString The JSON string to prettify.
 * @param {number} spaces The number of spaces to use for indentation.
 * @returns {{prettified: string, error: string}} An object containing the prettified JSON or an error message.
 */
export const prettifyJson = (jsonString, spaces = 2) => {
  try {
    if (!jsonString.trim()) {
      return { prettified: '', error: '' };
    }

    const parsed = JSON.parse(jsonString);
    const prettified = JSON.stringify(parsed, null, spaces);
    return { prettified, error: '' };
  } catch (err) {
    return { prettified: '', error: 'Invalid JSON: ' + err.message };
  }
};

/**
 * Gets the JSON path for a specific line and column in a JSON string.
 * Uses a 1D offset tokenizer to cleanly parse full structures without breaking mid-string.
 * @param {string} jsonString The raw JSON string.
 * @param {number} targetLine The 1-based line number.
 * @param {number} targetColumn The 1-based column number.
 * @returns {string} The JSON path.
 */
export const getJsonPath = (jsonString, targetLine, targetColumn) => {
  if (!jsonString || typeof jsonString !== 'string' || !jsonString.trim()) {
    return '';
  }

  // 1. Converter Linha/Coluna para um Offset absoluto (1D)
  let targetOffset = 0;
  let currentLine = 1;
  let currentCol = 1;

  for (let i = 0; i < jsonString.length; i++) {
    if (currentLine === targetLine && currentCol === targetColumn) {
      targetOffset = i;
      break;
    }
    if (jsonString[i] === '\n') {
      currentLine++;
      currentCol = 1;
    } else {
      currentCol++;
    }
  }

  // Se a posição do cursor passar dos limites da string, fixa o offset no final
  if (currentLine < targetLine || (currentLine === targetLine && currentCol < targetColumn)) {
    targetOffset = jsonString.length;
  }

  // 2. Tokenizar sequencialmente e atualizar a pilha de navegação
  let offset = 0;
  const stack = [];

  const buildPath = () => {
    let path = '';
    for (const item of stack) {
      if (item.type === 'object' && item.key !== null) {
        const isValidIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(item.key);
        if (isValidIdentifier) {
          path += path ? `.${item.key}` : item.key;
        } else {
          path += `["${item.key}"]`;
        }
      } else if (item.type === 'array') {
        path += `[${item.index}]`;
      }
    }
    return path;
  };

  while (offset < jsonString.length) {
    // Ignorar espaços em branco
    const startWs = offset;
    while (offset < jsonString.length && /\s/.test(jsonString[offset])) {
      offset++;
    }
    
    // Se o offset alvo for atingido dentro dos espaços (ex: recuo antes de uma chave)
    if (targetOffset >= startWs && targetOffset < offset) {
      return buildPath();
    }

    if (offset >= jsonString.length) break;

    // Retornar caso estejamos imediatamente antes de processar o próximo token
    if (targetOffset === offset) {
      return buildPath();
    }

    const char = jsonString[offset];
    const parent = stack.length > 0 ? stack[stack.length - 1] : null;

    if (char === '{') {
      stack.push({ type: 'object', key: null });
      offset++;
      if (targetOffset === offset) return buildPath();
    } else if (char === '}') {
      stack.pop();
      offset++;
      if (targetOffset === offset) return buildPath();
    } else if (char === '[') {
      stack.push({ type: 'array', index: 0 });
      offset++;
      if (targetOffset === offset) return buildPath();
    } else if (char === ']') {
      stack.pop();
      offset++;
      if (targetOffset === offset) return buildPath();
    } else if (char === ',') {
      // Avança índice do array ou limpa a chave do objeto atual para o próximo item
      if (parent) {
        if (parent.type === 'array') parent.index++;
        else if (parent.type === 'object') parent.key = null;
      }
      offset++;
      if (targetOffset === offset) return buildPath();
    } else if (char === ':') {
      offset++;
      if (targetOffset === offset) return buildPath();
    } else if (char === '"') {
      // Processar uma string (seja chave ou valor) por completo
      const startStr = offset;
      offset++; // Pula aspas de abertura
      let val = '';
      
      while (offset < jsonString.length && jsonString[offset] !== '"') {
        if (jsonString[offset] === '\\') {
          val += jsonString[offset + 1] || '';
          offset += 2;
        } else {
          val += jsonString[offset];
          offset++;
        }
      }
      if (offset < jsonString.length) offset++; // Pula aspas de fechamento

      // Se estamos dentro de um objeto e a chave atual for nula, essa string lida é a chave
      if (parent && parent.type === 'object' && parent.key === null) {
        parent.key = val;
      }

      // Validação do cursor: se estiver em qualquer lugar dessa string, o caminho já foi gerado
      if (targetOffset >= startStr && targetOffset <= offset) {
        return buildPath();
      }
    } else {
      // Processar primitivos puros (números, true, false, null)
      const startPrim = offset;
      while (offset < jsonString.length && !/[\s\]\},:]/.test(jsonString[offset])) {
        offset++;
      }

      if (targetOffset >= startPrim && targetOffset <= offset) {
        return buildPath();
      }
    }
  }

  return buildPath();
};