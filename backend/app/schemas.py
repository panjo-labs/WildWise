# Request aur response ke Pydantic schemas yahan define hain
# Frontend aur model dono ke saath contract yahi hai

from pydantic import BaseModel, Field, field_validator
from typing import List, Literal
from enum import Enum


class Environment(str, Enum):
    garden = "Garden"
    park = "Park"
    forest = "Forest"
    anywhere = "Anywhere Outdoors"


class Interest(str, Enum):
    plants = "Plants"
    birds = "Birds"
    insects = "Insects"
    textures = "Textures"
    general = "General Discovery"


class Difficulty(str, Enum):
    beginner = "Beginner"
    explorer = "Curious Explorer"


class QuestRequest(BaseModel):
    environment: Environment
    duration_minutes: Literal[10, 20, 30]
    interests: List[Interest] = Field(min_length=1, max_length=5)
    difficulty: Difficulty


# Ek individual challenge jo model generate karta hai
class Challenge(BaseModel):
    id: int
    title: str
    instruction: str
    fact: str


# Poore quest ka response structure
class QuestResponse(BaseModel):
    quest_title: str
    introduction: str
    estimated_minutes: int
    challenges: List[Challenge] = Field(min_length=3, max_length=5)
    is_offline: bool = False
    source: str = "ai_generated"


class HealthResponse(BaseModel):
    status: str
    model: str
    online_generation_enabled: bool = False


class AskAIRequest(BaseModel):
    quest_title: str = Field(min_length=1, max_length=200)
    instruction: str = Field(min_length=1, max_length=1500)
    category: str = Field(default="Nature", min_length=1, max_length=200)
    observation: str = Field(min_length=1, max_length=2000)

    @field_validator("quest_title", "instruction", "category", "observation")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty.")
        return value


class AskAIResponse(BaseModel):
    what_it_might_be: str
    why_it_looks_or_behaves_that_way: str
    real_world_uses: str
    practical_tip: str
    explore_next: str
    facts_and_uncertainty: str
