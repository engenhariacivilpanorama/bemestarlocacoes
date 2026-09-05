def calcular_valor_total(valor_diaria, dias, desconto_percentual=0):
    """Calcula o valor total de uma locação.

    valor_diaria: valor cobrado por dia
    dias: quantidade de dias da locação
    desconto_percentual: desconto a aplicar sobre o total, de 0 a 100
    """
    if valor_diaria < 0:
        raise ValueError("valor_diaria não pode ser negativo")
    if dias < 0:
        raise ValueError("dias não pode ser negativo")
    if not 0 <= desconto_percentual <= 100:
        raise ValueError("desconto_percentual deve estar entre 0 e 100")

    total = valor_diaria * dias
    total -= total * (desconto_percentual / 100)
    return total
