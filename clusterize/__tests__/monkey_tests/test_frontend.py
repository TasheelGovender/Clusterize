import pytest
import os
import random
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

@pytest.fixture(scope="module")
def driver():
    driver = webdriver.Chrome()
    driver.get("http://localhost:3000")  # Change to your login URL

    # Find and click 'get started' button if exists
    try:
        get_started_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Get Started')]")
        get_started_button.click()
    except Exception:
        pass

    # Automate login
    driver.find_element(By.NAME, "username").send_keys("test@gmail.com")
    driver.find_element(By.NAME, "password").send_keys("test@1234")
    driver.find_element(By.XPATH, "//button[@type='submit']").click()

    # Wait for login to complete (adjust as needed)
    driver.implicitly_wait(5)
    yield driver
    driver.quit()

def test_home_page(driver):
    driver.get("http://localhost:3000/projects") 
    clickable = driver.find_elements(By.XPATH, "//button | //a")
    for _ in range(20):
        if clickable:
            elem = random.choice(clickable)
            try:
                elem.click()
            except Exception:
                os.makedirs("screenshots", exist_ok=True)
                driver.save_screenshot(f"screenshots/screenshot_test_dashboard_{random.randint(1,10000)}.png")
                pass

def test_projects_page(driver):
    driver.get("http://localhost:3000/projects/84")  
    clickable = driver.find_elements(By.XPATH, "//button | //a")
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    for _ in range(20):
        if clickable:
            elem = random.choice(clickable)
            try:
                elem.click()
            except Exception:
                os.makedirs("screenshots", exist_ok=True)
                driver.save_screenshot(f"screenshots/screenshot_test_projects_dashboard_{random.randint(1,10000)}.png")
                pass

def test_upload_dialog(driver):
    driver.get("http://localhost:3000/projects/84")
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

    # Open the upload dialog (adjust selector as needed)
    try:
        upload_button = driver.find_element(By.XPATH, "//button[contains(., 'Upload')]")
        upload_button.click()
    except Exception:
        pass

    # Switch to Images tab
    try:
        images_tab = driver.find_element(By.XPATH, "//button[contains(., 'Images')]")
        images_tab.click()
    except Exception:
        pass

    # Upload image files
    try:
        # Show file input by clicking 'Select Files'
        select_files_btn = driver.find_element(By.XPATH, "//button[contains(., 'Select Files')]")
        select_files_btn.click()
        file_input = driver.find_element(By.CSS_SELECTOR, "input[type='file'][accept='image/*']")
        test_image_path = os.path.abspath("tests/assets/test_image.jpg")  # Ensure this file exists
        file_input.send_keys(test_image_path)
        upload_btn = driver.find_element(By.XPATH, "//button[contains(., 'Upload')]")
        upload_btn.click()
    except Exception:
            os.makedirs("screenshots", exist_ok=True)
            driver.save_screenshot(f"screenshots/screenshot_test_upload_images_{random.randint(1,10000)}.png")
            pass

    # Switch to CSV tab
    try:
        csv_tab = driver.find_element(By.XPATH, "//button[contains(., 'CSV')]")
        csv_tab.click()
    except Exception:
        pass

    # Upload CSV file
    try:
        select_csv_btn = driver.find_element(By.XPATH, "//button[contains(., 'Select CSV Files')]")
        select_csv_btn.click()
        csv_input = driver.find_element(By.CSS_SELECTOR, "input[type='file'][accept='.csv']")
        test_csv_path = os.path.abspath("tests/assets/test_data.csv")  # Ensure this file exists
        csv_input.send_keys(test_csv_path)
        # If Upload CSV button appears, click it
        upload_csv_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Upload CSV')]")
        if upload_csv_btns:
            upload_csv_btns[0].click()
    except Exception:
            os.makedirs("screenshots", exist_ok=True)
            driver.save_screenshot(f"screenshots/screenshot_test_upload_csv_{random.randint(1,10000)}.png")
            pass

def test_filter_sidebar(driver):
    import random

    driver.get("http://localhost:3000/projects/84")
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

    # Expand Cluster section if collapsed
    try:
        cluster_toggle = driver.find_element(By.XPATH, "//label[contains(text(), 'Cluster Selection')]/../../following-sibling::*[1]/*[name()='svg']")
        cluster_toggle.click()
    except Exception:
        pass

    # Randomly select cluster checkboxes
    try:
        cluster_checkboxes = driver.find_elements(By.XPATH, "//input[contains(@id, '-num')]")
        num_to_select = random.randint(1, len(cluster_checkboxes)) if cluster_checkboxes else 0
        selected_clusters = random.sample(cluster_checkboxes, num_to_select) if num_to_select else []
        for checkbox in selected_clusters:
            driver.execute_script("arguments[0].scrollIntoView();", checkbox)
            if not checkbox.is_selected():
                checkbox.click()
    except Exception:
        pass

    # Expand Label section if collapsed
    try:
        label_toggle = driver.find_element(By.XPATH, "//label[contains(text(), 'Label Selection')]/../../following-sibling::*[1]/*[name()='svg']")
        label_toggle.click()
    except Exception:
        pass

    # Randomly select label checkboxes
    try:
        label_checkboxes = driver.find_elements(By.XPATH, "//input[contains(@id, '-label')]")
        num_to_select = random.randint(1, len(label_checkboxes)) if label_checkboxes else 0
        selected_labels = random.sample(label_checkboxes, num_to_select) if num_to_select else []
        for checkbox in selected_labels:
            driver.execute_script("arguments[0].scrollIntoView();", checkbox)
            if not checkbox.is_selected():
                checkbox.click()
    except Exception:
        pass

    # Expand Tag section if collapsed
    try:
        tag_toggle = driver.find_element(By.XPATH, "//label[contains(text(), 'Tag Selection')]/../../following-sibling::*[1]/*[name()='svg']")
        tag_toggle.click()
    except Exception:
        pass

    # Randomly select tag checkboxes
    try:
        tag_checkboxes = driver.find_elements(By.XPATH, "//input[not(contains(@id, '-num')) and not(contains(@id, '-label')) and not(@id='relocated_images')]")
        num_to_select = random.randint(1, len(tag_checkboxes)) if tag_checkboxes else 0
        selected_tags = random.sample(tag_checkboxes, num_to_select) if num_to_select else []
        for checkbox in selected_tags:
            driver.execute_script("arguments[0].scrollIntoView();", checkbox)
            if not checkbox.is_selected():
                checkbox.click()
    except Exception:
        pass

    # Randomly check or uncheck relocated images checkbox
    try:
        relocated_checkbox = driver.find_element(By.ID, "relocated_images")
        driver.execute_script("arguments[0].scrollIntoView();", relocated_checkbox)
        if random.choice([True, False]):
            if not relocated_checkbox.is_selected():
                relocated_checkbox.click()
        else:
            if relocated_checkbox.is_selected():
                relocated_checkbox.click()
    except Exception:
        pass

    # Click the Search Images button
    try:
        search_button = driver.find_element(By.XPATH, "//button[contains(., 'Search Images')]")
        driver.execute_script("arguments[0].scrollIntoView();", search_button)
        search_button.click()
    except Exception:
                os.makedirs("screenshots", exist_ok=True)
                driver.save_screenshot(f"screenshots/screenshot_test_filter_sidebar_{random.randint(1,10000)}.png")
                pass

def test_user_profile_page(driver):
    driver.get("http://localhost:3000/user-profile")  
    clickable = driver.find_elements(By.XPATH, "//button | //a")
    for _ in range(20):
        if clickable:
            elem = random.choice(clickable)
            try:
                elem.click()
            except Exception:
                os.makedirs("screenshots", exist_ok=True)
                driver.save_screenshot(f"screenshots/screenshot_test_user_profile_page_{random.randint(1,10000)}.png")
                pass