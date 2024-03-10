from PIL import Image
import requests
import streamlit as st
from streamlit_lottie import st_lottie


st.set_page_config(page_title = "Easy Eats", page_icon = ":tada:", layout="wide")

def load_lottieurl(url):
    r= requests.get(url)
    if r.status_code !=200:
        return None
    return r.json()

#Use local CSS
def local_css(file_name):
    with open(file_name) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html = True)

local_css("style/style.css")
 #-----Load Images -----
lottie_coding = load_lottieurl("https://lottie.host/f66efea0-1ec6-48d2-bdf7-b5bf6673718b/qGdmt6a3qJ.json")       
img_contact_form = Image.open("images/top.png")
img_lottie_animation=Image.open("images/mostcommon.png")

# ----- Header Section ----

with st.container():

    st.subheader ("Hello I am jason:wave:")
    st.title("mr.milne")
    st.write("I am passionate about coding a website")

    #steamlit will display the text in the square bracket and once the user clicks on the text they will de directed to the link
    st.write("[learn more>](https://www.youtube.com)")
         

# ----- What I DO -----
with st.container(): 
    st.write("----")
    left_column, right_column = st.columns(2)
    with left_column:
        st.header("What I do")
        st.write("##")
        st.write( """I am making an app for allergies
                 

"""

        )
        st.write("[Youtube Channel>] (https://www.youtube.com/@CodingIsFun)")
    with right_column:
        st_lottie(lottie_coding, height= 300, key= "coding")


# ---- Projects ---
with st.container():
    st.write("---")
    st.header("My projects")
    st.write("##")
    image_column, text_column = st.columns((1,2))
    with image_column:
        #insert image
        st.image(img_lottie_animation)

    with text_column:
        st.subheader("intergrate lottie animation inside your streamlit app")
        st.write(
        """
        Learn how to use lottie files in streamlit!
"""
        )
        st.markdown("[Look at the ingredients](https://www.chick-fil-a.com/nutrition-allergens)")


with st.container():
    image_column, text_column = st.columns((1,2))
    with image_column:
        #insert image
        st.image(img_contact_form)
    with text_column:
        st.subheader("intergrate lottie animation inside your streamlit app")
        st.write(
        """
        Learn how to use lottie files in streamlit!
"""
        )


# --- Contact ---
with st.container():
    st.write("---")
    st.header("Get in touch with me!")
    st.write("##")

    contact_form = """
    <form action="https://formsubmit.co/jw30221@sersd.org" method="POST">
        <input type= "hidden" name = "_captcha" value = "false">
        <input type="text" name="name" placeholder = "Your Name" required>
        <input type="email" name="email" placeholder = "Your email" required>
        <textarea name="message" placeholder= "your message here" required></textarea>
        <button type="submit">Send</button>
    </form>
    """

left_column, right_column = st.columns(2)
with left_column:
    st.markdown(contact_form, unsafe_allow_html = True)
with right_column:
    st.empty()

