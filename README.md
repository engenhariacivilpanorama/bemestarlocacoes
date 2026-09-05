# Bem Estar Locações

Projeto de exemplo para calcular o valor total de uma locação com base no
valor diário e na quantidade de dias.

## Uso

```python
from calculadora_locacao import calcular_valor_total

total = calcular_valor_total(valor_diaria=100, dias=5)
print(total)  # 500
```

## Testes

```bash
python -m pytest test_calculadora_locacao.py
```
