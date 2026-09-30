"""
Me'morAI Demo Bot - FSM StatesGroup Holatlari
"""
from aiogram.fsm.state import State, StatesGroup


class RampSlopeStates(StatesGroup):
    """Pandus qiyaligini tekshirish holatlari."""
    waiting_for_rise = State()  # Ko'tarilish balandligi (rise_m)
    waiting_for_run = State()   # Gorizontal uzunlik (run_m)


class CeilingHeightStates(StatesGroup):
    """Shift balandligini tekshirish holatlari."""
    waiting_for_height = State()  # Shift balandligi (height_m)


class ParkingRatioStates(StatesGroup):
    """Avtoturargoh koeffitsientini tekshirish holatlari."""
    waiting_for_spots = State()       # Jami avtoturargoh o'rinlari (spots)
    waiting_for_apartments = State()  # Jami xonadonlar soni (apartments)


class FireRoadStates(StatesGroup):
    """Yong'in o'tish yo'li kengligini tekshirish holatlari."""
    waiting_for_width = State()  # Yo'l kengligi (width_m)
