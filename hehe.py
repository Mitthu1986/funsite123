import pyautogui
import random

if pyautogui.press('space'):

    pyautogui.move = pyautogui.moveTo(random.randint(100, 300), 200, duration=1)

