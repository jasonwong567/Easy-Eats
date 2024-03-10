#setup 
import requests
import pandas as pd


ingredient = 'allergy'
# Load the Excel file
df = pd.read_excel('/Downloads/BU /allergies.xlsx', engine='openpyxl')
filtered_df = df[~df['Ingredients'].str.lower().str.contains(ingredient)]
print(filtered_df)

foodlist = "foodlist.txt"



def get_nutrition_info(ingredient):
    
    app_id = 'fa8a20e0'  # Replace with your actual app_id
    app_key = '4d6207e994132ed529dccfca966c21a5'  # Replace with your actual app_key
    url = 'https://api.edamam.com/api/nutrition-data'
    params = {
        'app_id': app_id,
        'app_key': app_key,
        'ingr': ingredient
    }


nutrition_info = get_nutrition_info(ingredient)
'''if nutrition_info:
    print(nutrition_info)

    # Making the GET request to the Edamam API
    response = requests.get(url, params=params)
    
    # Checking if the request was successful
    if response.status_code == 200:
        return response.json()
    else:
        print("Failed to retrieve data")
        return None
'''

allergens = ["dairy", "peanuts" "shellfish", "egg", "soy"]


def get_user_allergy():
    global allergy
    #Asks the user for their allergy and returns it.
    allergy = input("Please enter your allergy: ").lower()
    #return allergy


#for the dairy allergy, create a 
def dairy_allergy():
    global allergy
    if allergy == "dairy":
        return foodlist 

filtered_df.to_excel('filtered_products.xlsx', index=False, engine='openpyxl')

get_user_allergy()
