import pytest

from calculadora_locacao import calcular_valor_total


def test_calculo_simples():
    assert calcular_valor_total(100, 5) == 500


def test_calculo_com_desconto():
    assert calcular_valor_total(100, 5, desconto_percentual=10) == 450


def test_valor_diaria_negativo_gera_erro():
    with pytest.raises(ValueError):
        calcular_valor_total(-10, 5)


def test_dias_negativo_gera_erro():
    with pytest.raises(ValueError):
        calcular_valor_total(100, -5)
