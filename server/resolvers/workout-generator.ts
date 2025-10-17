import { z } from "zod";

export const workoutGeneratorInputSchema = z.object({
  daysPerWeek: z.number().int().min(1).max(7),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  focusArea: z.enum(['strength', 'cardio', 'flexibility', 'full-body']).default('full-body'),
  duration: z.number().int().min(15).max(120).default(30), // minutes
  equipment: z.enum(['none', 'basic', 'gym']).default('none'),
});

export const workoutGeneratorOutputSchema = z.object({
  weeklySchedule: z.array(z.object({
    day: z.string(),
    workoutType: z.string(),
    duration: z.number(),
    exercises: z.array(z.object({
      name: z.string(),
      sets: z.number().optional(),
      reps: z.string().optional(),
      duration: z.string().optional(),
      description: z.string(),
    })),
  })),
  tips: z.array(z.string()),
  summary: z.object({
    totalWorkouts: z.number(),
    averageDuration: z.number(),
    level: z.string(),
    focusArea: z.string(),
  }),
});

export type WorkoutGeneratorInput = z.infer<typeof workoutGeneratorInputSchema>;
export type WorkoutGeneratorOutput = z.infer<typeof workoutGeneratorOutputSchema>;

const exercises = {
  strength: {
    none: [
      { name: 'Push-ups', sets: 3, reps: '8-12', description: 'Classic upper body exercise' },
      { name: 'Squats', sets: 3, reps: '10-15', description: 'Lower body strength builder' },
      { name: 'Lunges', sets: 3, reps: '10 each leg', description: 'Single-leg strength exercise' },
      { name: 'Plank', duration: '30-60 seconds', description: 'Core stability exercise' },
      { name: 'Burpees', sets: 3, reps: '5-10', description: 'Full-body conditioning' },
    ],
    basic: [
      { name: 'Dumbbell Rows', sets: 3, reps: '8-12', description: 'Back strengthening exercise' },
      { name: 'Goblet Squats', sets: 3, reps: '10-15', description: 'Weighted squat variation' },
      { name: 'Dumbbell Press', sets: 3, reps: '8-12', description: 'Upper body pressing movement' },
      { name: 'Romanian Deadlifts', sets: 3, reps: '10-12', description: 'Hip hinge movement' },
    ],
    gym: [
      { name: 'Bench Press', sets: 3, reps: '8-10', description: 'Classic chest exercise' },
      { name: 'Deadlifts', sets: 3, reps: '5-8', description: 'Full-body strength exercise' },
      { name: 'Squats', sets: 3, reps: '8-12', description: 'Barbell squat' },
      { name: 'Pull-ups', sets: 3, reps: '5-10', description: 'Upper body pulling exercise' },
    ],
  },
  cardio: {
    none: [
      { name: 'Jumping Jacks', duration: '30 seconds', description: 'Full-body cardio exercise' },
      { name: 'High Knees', duration: '30 seconds', description: 'Running in place variation' },
      { name: 'Mountain Climbers', duration: '30 seconds', description: 'Core and cardio combo' },
      { name: 'Running in Place', duration: '1 minute', description: 'Simple cardio exercise' },
    ],
    basic: [
      { name: 'Jump Rope', duration: '2-3 minutes', description: 'Excellent cardio exercise' },
      { name: 'Kettlebell Swings', sets: 3, reps: '15-20', description: 'Full-body cardio and strength' },
    ],
    gym: [
      { name: 'Treadmill Running', duration: '20-30 minutes', description: 'Steady-state cardio' },
      { name: 'Rowing Machine', duration: '15-20 minutes', description: 'Full-body cardio' },
      { name: 'Stationary Bike', duration: '20-30 minutes', description: 'Low-impact cardio' },
    ],
  },
  flexibility: {
    none: [
      { name: 'Cat-Cow Stretch', duration: '1 minute', description: 'Spine mobility exercise' },
      { name: 'Downward Dog', duration: '30 seconds', description: 'Full-body stretch' },
      { name: 'Hip Flexor Stretch', duration: '30 seconds each', description: 'Hip mobility exercise' },
      { name: 'Shoulder Rolls', duration: '30 seconds', description: 'Shoulder mobility' },
    ],
    basic: [
      { name: 'Foam Rolling', duration: '5-10 minutes', description: 'Myofascial release' },
      { name: 'Resistance Band Stretches', duration: '10 minutes', description: 'Assisted stretching' },
    ],
    gym: [
      { name: 'Yoga Class', duration: '45-60 minutes', description: 'Guided flexibility session' },
      { name: 'Stretching Routine', duration: '15-20 minutes', description: 'Full-body stretching' },
    ],
  },
};

export function workoutGeneratorResolver(input: WorkoutGeneratorInput): WorkoutGeneratorOutput {
  const { daysPerWeek, level, focusArea = 'full-body', duration = 30, equipment = 'none' } = input;
  
  const workoutTypes = focusArea === 'full-body' 
    ? ['strength', 'cardio', 'flexibility']
    : [focusArea];
  
  const weeklySchedule = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  for (let i = 0; i < daysPerWeek; i++) {
    const workoutType = workoutTypes[i % workoutTypes.length];
    const exercisePool = exercises[workoutType as keyof typeof exercises][equipment];
    
    // Select exercises based on level
    const numExercises = level === 'beginner' ? 3 : level === 'intermediate' ? 4 : 5;
    const selectedExercises = exercisePool.slice(0, numExercises);
    
    // Adjust sets/reps based on level
    const adjustedExercises = selectedExercises.map(exercise => ({
      ...exercise,
      sets: exercise.sets && level === 'beginner' ? Math.max(2, exercise.sets - 1) :
            exercise.sets && level === 'advanced' ? exercise.sets + 1 : exercise.sets,
    }));
    
    weeklySchedule.push({
      day: days[i],
      workoutType: workoutType.charAt(0).toUpperCase() + workoutType.slice(1),
      duration,
      exercises: adjustedExercises,
    });
  }
  
  const tips = [
    'Always warm up before exercising and cool down afterwards',
    'Stay hydrated throughout your workout',
    'Listen to your body and rest when needed',
    'Focus on proper form over speed or weight',
    'Progress gradually to avoid injury',
  ];
  
  // Add level-specific tips
  if (level === 'beginner') {
    tips.push('Start with bodyweight exercises and gradually add resistance');
  } else if (level === 'advanced') {
    tips.push('Consider periodization and recovery for optimal results');
  }
  
  return {
    weeklySchedule,
    tips: tips.slice(0, 3), // Return top 3 tips
    summary: {
      totalWorkouts: daysPerWeek,
      averageDuration: duration,
      level,
      focusArea,
    },
  };
}
