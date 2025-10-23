import pytest
import os
import random
import time
import logging
import tempfile
import base64
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import ElementClickInterceptedException, StaleElementReferenceException
from selenium.webdriver.common.keys import Keys


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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

def test_project_create_input(driver):
    driver.delete_all_cookies()
    driver.get("http://localhost:3000/projects") 

    test_cases = [
        {"value": "", "should_pass": False, "error": "Project name is required."},
        {"value": "ab", "should_pass": False, "error": "Project name must be at least 3 characters."},
        {"value": "A"*101, "should_pass": False, "error": "Project name must be less than 50 characters."},
        {"value": "Proj@ct!", "should_pass": False, "error": "Project name contains invalid characters."},
        {"value": "Testing", "should_pass": False, "error": "Project name already exists"},
        {"value": "Valid Project", "should_pass": True, "error": None},
    ]


    for case in test_cases:
        # Click the "Create Project" button to open the dialog
        create_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Create Project')]"))
        )
        create_btn.click()

        # Wait for the dialog and input to appear
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "name"))
        )
        project_name_input = driver.find_element(By.ID, "name")
        project_name_input.clear()
        project_name_input.send_keys(case["value"])
        # time.sleep(1)  

        submit_btn = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//button[contains(., 'Create Project') and @type='submit']"))
        )
        is_disabled = submit_btn.get_attribute("disabled")
        is_disabled = is_disabled is not None and is_disabled != "false"

        if not is_disabled:
            submit_btn.click()
            # time.sleep(1)
            if not case["should_pass"]:
                try:
                    WebDriverWait(driver, 3).until(
                        lambda d: d.find_elements(By.XPATH, f"//*[contains(normalize-space(string(.)), \"{case['error']}\")]")
                    )
                except Exception:
                    raise AssertionError(f"Expected error '{case['error']}' for input '{case['value']}'")
            else:
                WebDriverWait(driver, 5).until(
                    EC.invisibility_of_element((By.XPATH, "//div[@role='dialog']"))
                )
                logger.info("Debug message: successfully created project with input: %s", case)
                # cleanup: delete the created project so test can be re-run
                try:
                    project_name = case["value"]
                    # locate the table row that contains the project name (contains to be tolerant)
                    row_xpath = f"//tr[.//*[contains(normalize-space(.), \"{project_name}\")]]"
                    row = WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.XPATH, row_xpath))
                    )

                    # find the delete button in that row (uses title attribute from markup)
                    delete_btn = row.find_element(By.XPATH, ".//button[@title='Delete Project']")
                    # click safely via JS in case of interception
                    try:
                        delete_btn.click()
                    except Exception:
                        driver.execute_script("arguments[0].click();", delete_btn)

                    # wait for delete confirmation dialog and click the "Delete" button
                    confirm_btn = WebDriverWait(driver, 5).until(
                        EC.element_to_be_clickable((By.XPATH, "//div[@role='dialog']//button[normalize-space(.)='Delete']"))
                    )
                    try:
                        confirm_btn.click()
                    except Exception:
                        driver.execute_script("arguments[0].click();", confirm_btn)

                    # wait for the row to be removed from the table
                    WebDriverWait(driver, 10).until_not(
                        EC.presence_of_element_located((By.XPATH, row_xpath))
                    )
                    logger.info("Deleted project created during test: %s", project_name)
                    continue
                except Exception:
                    os.makedirs("screenshots", exist_ok=True)
                    driver.save_screenshot(f"screenshots/cleanup_fail_{case['value']}.png")
                    with open(f"screenshots/cleanup_fail_{case['value']}.html", "w") as f:
                        f.write(driver.page_source)
                    logger.exception("Failed to cleanup project: %s", case["value"])
        else:
            logger.info("Debug message: submit is disabled for input: %s", case)

        # click "Cancel"
        cancel_btn = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//div[@role='dialog']//button[normalize-space(.)='Cancel']"))
        )
        cancel_btn.click()

def test_file_uploads(driver):
    driver.delete_all_cookies()
    driver.refresh()
    driver.get("http://localhost:3000/projects/84")  

    # time.sleep(1)

    upload_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[.//span[normalize-space()='Upload Images']]"))
    )
    upload_btn.click()

    WebDriverWait(driver, 5).until(
        lambda d: d.find_element(By.XPATH, "//div[@role='tablist']//button[normalize-space()='Images']").get_attribute("data-state") == "active"
    )

    # time.sleep(1)
    
    # helper: create a tiny PNG file
    def make_png(path):
        # 1x1 transparent PNG base64
        png_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
        with open(path, "wb") as f:
            f.write(base64.b64decode(png_b64))

    # helper: create a small CSV file
    def make_csv(path):
        with open(path, "w") as f:
            f.write("id,name\n1,test\n")

    # helper: create a text file (invalid for images)
    def make_txt(path):
        with open(path, "w") as f:
            f.write("just some text\n")

    tmp_files = []
    try:
        # create files
        tmp_dir = tempfile.gettempdir()
        img_path = os.path.join(tmp_dir, f"test_img_{random.randint(1,999999)}.png")
        csv_path = os.path.join(tmp_dir, f"test_csv_{random.randint(1,999999)}.csv")
        txt_path = os.path.join(tmp_dir, f"test_txt_{random.randint(1,999999)}.txt")
        make_png(img_path); tmp_files.append(img_path)
        make_csv(csv_path); tmp_files.append(csv_path)
        make_txt(txt_path); tmp_files.append(txt_path)

        # locate input[type=file] inside the upload dialog (may be hidden)
        file_input = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='file']"))
        )

        # 1) Valid image upload: send image file and assert submit becomes visible/enabled
        file_input.send_keys(os.path.abspath(img_path))

        submit_selector = (By.XPATH, "//div[@role='dialog']//button[normalize-space(.)='Upload' or normalize-space(.)='Upload Images' or @type='submit']")
        
        WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable(submit_selector)
        )
        
        # click upload and wait for dialog to close
        submit_btn = driver.find_element(*submit_selector)
        try:
            submit_btn.click()
        except Exception:
            driver.execute_script("arguments[0].click();", submit_btn)
        WebDriverWait(driver, 10).until_not(EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']")))
        logger.info("Debug: Image uploaded successfully")

        # 2) CSV upload: open dialog again and switch to CSV tab
        upload_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[.//span[normalize-space()='Upload Images']]"))
        )
        upload_btn.click()
        csv_tab = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//div[@role='tablist']//button[normalize-space()='CSV']"))
        )
        logger.info("Debug: CSV tab found")

        try:
            csv_tab.click()
        except Exception:
            driver.execute_script("arguments[0].click();", csv_tab)
        
        WebDriverWait(driver, 5).until(
            lambda d: d.find_element(By.XPATH, "//div[@role='tablist']//button[normalize-space()='CSV']").get_attribute("data-state") == "active"
        )
        
        # time.sleep(1)
        
        file_input = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='file']"))
        )

        file_input.send_keys(os.path.abspath(csv_path))

        submit_selector = (By.XPATH, "//div[@role='dialog']//button[normalize-space(.)='Upload CSV' or normalize-space(.)='Upload' or normalize-space(.)='Upload Images' or @type='submit']")
        WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable(submit_selector)
        )
        logger.info("Debug: CSV uploaded")
        # time.sleep(1)

        submit_btn = driver.find_element(*submit_selector)
        logger.info("Debug: CSV submit button found")


    finally:
        # cleanup temp files
        for p in tmp_files:
            try:
                os.remove(p)
            except Exception:
                pass

def test_create_cluster_input(driver):
    driver.delete_all_cookies()
    driver.refresh()
    driver.get("http://localhost:3000/projects/84")

    # Open dialog
    add_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-slot='tooltip-trigger']"))
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", add_btn)
    try:
        add_btn.click()
    except (ElementClickInterceptedException, StaleElementReferenceException):
        add_btn = driver.find_element(By.CSS_SELECTOR, "button[data-slot='tooltip-trigger']")
        driver.execute_script("arguments[0].click();", add_btn)

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']"))
    )
    # time.sleep(1)

    # Cluster label validation cases
    test_cases = [
        {"value": "", "should_pass": True, "error": None},
        {"value": "ab", "should_pass": False, "error": "Label must be at least 3 characters."},
        {"value": "A"*51, "should_pass": False, "error": "Label must be less than 50 characters."},
        {"value": "L@bel./", "should_pass": False, "error": "Label contains invalid characters."},
        {"value": "Valid Label", "should_pass": True, "error": None},
    ]

    for case in test_cases:
        # Find and fill the label input (adjust selector as needed)
        label_input = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='label'], input[placeholder*='Label']"))
        )
        label_input.clear()
        label_input.send_keys(case["value"])
        time.sleep(0.5)

        # Find and click "Create Cluster"
        create_cluster_btn = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//div[@role='dialog']//button[contains(., 'Create Cluster')]"))
        )
        create_cluster_btn.click()
        time.sleep(0.5)

        if not case["should_pass"]:
            # Wait for error message
            try:
                WebDriverWait(driver, 3).until(
                    lambda d: d.find_elements(By.XPATH, f"//*[contains(text(), \"{case['error']}\")]")
                )
            except Exception:
                raise AssertionError(f"Expected error '{case['error']}' for input '{case['value']}'")
        else:
            # Wait for dialog to close
            WebDriverWait(driver, 5).until_not(
                EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']"))
            )
            # Re-open dialog for next test case
            add_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-slot='tooltip-trigger']"))
            )
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", add_btn)
            try:
                add_btn.click()
            except Exception:
                driver.execute_script("arguments[0].click();", add_btn)
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']"))
            )
            # time.sleep(1)

def test_edit_cluster_input(driver):
    driver.delete_all_cookies()
    driver.refresh()
    driver.get("http://localhost:3000/projects/84")
    # Cluster label validation cases
    test_cases = [
        {"value": "", "should_pass": True, "error": None},
        {"value": "ab", "should_pass": False, "error": "Label must be at least 3 characters."},
        {"value": "A"*51, "should_pass": False, "error": "Label must be less than 50 characters."},
        {"value": "L@bel./", "should_pass": False, "error": "Label contains invalid characters."},
        {"value": "Valid Label", "should_pass": True, "error": None},
    ]

    # Find and click the first cluster card (by class, not label)
    cluster_card = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "(//div[contains(@class, 'group') and contains(@class, 'cursor-pointer')])[1]"))
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", cluster_card)
    try:
        cluster_card.click()
    except (ElementClickInterceptedException, StaleElementReferenceException):
        driver.execute_script("arguments[0].click();", cluster_card)

    # Wait for the dialog to appear
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']"))
    )
    # time.sleep(1)

    # Find and click the "Edit label" button inside the dialog
    edit_label_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//div[@role='dialog']//button[@data-testid='edit-label-button']"))
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", edit_label_btn)
    try:
        edit_label_btn.click()
        # time.sleep(1)
        # Find the label input field
        label_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Enter label name...']"))
        )
        label_input.clear()
        time.sleep(0.5)

        for case in test_cases:
            label_input.clear()
            label_input.send_keys(case["value"])
            logger.info("Set label input to: %s", case)
            time.sleep(0.5)

            driver.execute_script("arguments[0].blur();", label_input)
            time.sleep(0.2)

            # Re-find the save button after overlay closes
            save_btn = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//button[.//span[contains(., 'Save')] or contains(., 'Save')]"))
            )
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", save_btn)
            try:
                save_btn.click()
            except (ElementClickInterceptedException, StaleElementReferenceException):
                driver.execute_script("arguments[0].click();", save_btn)
            logger.info("Clicked save for input: %s", case)
            # time.sleep(0.5)

            if not case["should_pass"]:
                logger.info("Expected error for input: %s", case)
                # Wait for error message
                try:
                    WebDriverWait(driver, 3).until(
                        lambda d: d.find_elements(By.XPATH, f"//*[contains(text(), \"{case['error']}\")]")
                    )
                except Exception:
                    raise AssertionError(f"Expected error '{case['error']}' for input '{case['value']}'")
            else:
                logger.info("No error expected for input: %s", case)
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']"))
                )

                # Click edit button again
                edit_label_btn = WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, "//div[@role='dialog']//button[@data-testid='edit-label-button']"))
                )
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", edit_label_btn)
                edit_label_btn.click()
                label_input = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Enter label name...']"))
                )
                # time.sleep(0.5)
    
    except (ElementClickInterceptedException, StaleElementReferenceException):
        driver.execute_script("arguments[0].click();", edit_label_btn)

def test_edit_objects_input(driver):
    driver.delete_all_cookies()
    driver.refresh()
    driver.get("http://localhost:3000/projects/84")

    # Example tag validation cases
    tag_cases = [
        {"value": "a", "should_pass": False, "error": "Tag must be at least 2 characters."},
        {"value": "a"*31, "should_pass": False, "error": "Tag must be less than 30 characters."},
        {"value": "bad tag!", "should_pass": False, "error": "Tag contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed."},
        {"value": "valid123", "should_pass": True, "error": None},
    ]

    cluster_cases = [
        {"value": "a"*21, "should_pass": False, "error": "Cluster name must be less than 20 characters."},
        {"value": "bad$name!", "should_pass": False, "error": "Cluster name contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed."},
        {"value": "valid_cluster", "should_pass": True, "error": None},
    ]

    # Find and expand the "Cluster Selection" panel
    panel_toggle = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((
            By.XPATH,
            "//div[contains(@class, 'bg-gray-800/50') and .//label[text()='Cluster Selection']]//div[contains(@class, 'flex') and contains(@class, 'cursor-pointer')]"
        ))
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", panel_toggle)
    try:
        panel_toggle.click()
    except (ElementClickInterceptedException, StaleElementReferenceException):
        driver.execute_script("arguments[0].click();", panel_toggle)

    # time.sleep(1)

    # Wait for the first checkbox to be present and clickable
    checkbox = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((
            By.XPATH,
            "(//button[@role='checkbox' and @data-slot='checkbox'])[2]"
        ))
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", checkbox)
    try:
        checkbox.click()
    except (ElementClickInterceptedException, StaleElementReferenceException):
        driver.execute_script("arguments[0].click();", checkbox)

    # time.sleep(1)

    # Find and click the "Search Images" button
    search_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((
            By.XPATH,
            "//button[@data-slot='button' and .//span[contains(., 'Search Images')] or contains(., 'Search Images')]"
        ))
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", search_btn)
    try:
        search_btn.click()
    except (ElementClickInterceptedException, StaleElementReferenceException):
        driver.execute_script("arguments[0].click();", search_btn)
    logger.info("Clicked Search Images button")

    # Wait for images to load
    webdriver_wait = WebDriverWait(driver, 10)
    webdriver_wait.until(
        EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'grid')]//img"))
    )
    logger.info("Images loaded")
    # time.sleep(1)

    # Click the first image to open the edit dialog
    card = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//div[@data-slot='card' and contains(@class, 'cursor-pointer')]"))
    )
    logger.info("Found image card")

    ellipsis_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='image-card-ellipsis']"))
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", ellipsis_btn)
    logger.info("found ellipsis button")
    try:
        ellipsis_btn.click()
        logger.info("Clicked ellipsis button")
    except (ElementClickInterceptedException, StaleElementReferenceException):
        driver.execute_script("arguments[0].click();", ellipsis_btn)


    # Testing tag input validation
    # Wait for the tag input field to appear in the dialog
    tag_input = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Add a tag...' and @type='text']"))
    )

    logger.info("Tag input field is present")

    # time.sleep(1)

    for case in tag_cases:
        tag_input.clear()
        tag_input.send_keys(case["value"])
        # time.sleep(0.5)

        # Wait for the 'Add' button next to the tag input
        add_tag_btn = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//button[@data-slot='button' and contains(., 'Add')]"))
        )

        logger.info("Add Tag button is present")

        try:
            add_tag_btn.click()
            logger.info("Clicked Add Tag button")
        except (ElementClickInterceptedException, StaleElementReferenceException):
            driver.execute_script("arguments[0].click();", add_tag_btn)

        if not case["should_pass"]:
            try:
                WebDriverWait(driver, 2).until(
                    lambda d: d.find_elements(By.XPATH, f"//*[contains(text(), \"{case['error']}\")]")
                )
            except Exception:
                raise AssertionError(f"Expected error '{case['error']}' for tag '{case['value']}'")
        else:
            # Wait for dialog to close
            WebDriverWait(driver, 5).until_not(
                EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']"))
            )
            # Re-open edit dialog for next test case
            ellipsis_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='image-card-ellipsis']"))
            )
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", ellipsis_btn)
            logger.info("Clicking ellipsis button")
            try:
                ellipsis_btn.click()
                logger.info("Clicked ellipsis button")
            except (ElementClickInterceptedException, StaleElementReferenceException):
                driver.execute_script("arguments[0].click();", ellipsis_btn)

            # Wait for the tag input field to appear in the dialog
            tag_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Add a tag...' and @type='text']"))
            )

        # Reset input for next case
        tag_input.clear()
        # time.sleep(0.2)

    logger.info("Completed tag input validation tests")
    
    # Testing change cluster input validation
    # Wait for the "Change Cluster" button and click it
    change_cluster_btn = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Set new cluster...' and @type='text']"))
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", change_cluster_btn)
    try:
        change_cluster_btn.click()
        logger.info("Clicked Change Cluster button")
        # time.sleep(1)
    except (ElementClickInterceptedException, StaleElementReferenceException):
        driver.execute_script("arguments[0].click();", change_cluster_btn)
    
    for case in cluster_cases:
        change_cluster_btn.clear()
        change_cluster_btn.send_keys(case["value"])
        # time.sleep(0.5)

        # Wait for the 'Set' button next to the cluster input
        set_cluster_btn = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//button[@data-slot='button' and contains(., 'Save')]"))
        )

        logger.info("Save Cluster button is present")

        try:
            set_cluster_btn.click()
            logger.info("Clicked Save Cluster button")
        except (ElementClickInterceptedException, StaleElementReferenceException):
            driver.execute_script("arguments[0].click();", set_cluster_btn)

        if not case["should_pass"]:
            try:
                WebDriverWait(driver, 2).until(
                    lambda d: d.find_elements(By.XPATH, f"//*[contains(text(), \"{case['error']}\")]")
                )
            except Exception:
                raise AssertionError(f"Expected error '{case['error']}' for cluster '{case['value']}'")
        else:
            # Wait for dialog to close
            WebDriverWait(driver, 5).until_not(
                EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']"))
            )
            # Re-open edit dialog for next test case
            ellipsis_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='image-card-ellipsis']"))
            )
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", ellipsis_btn)
            logger.info("Clicking ellipsis button")
            try:
                ellipsis_btn.click()
                logger.info("Clicked ellipsis button")
            except (ElementClickInterceptedException, StaleElementReferenceException):
                driver.execute_script("arguments[0].click();", ellipsis_btn)

            # Wait for the "Change Cluster" button and click it
            change_cluster_btn = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Set new cluster...' and @type='text']"))
            )
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", change_cluster_btn)
            try:
                change_cluster_btn.click()
                logger.info("Clicked Change Cluster button")
                # time.sleep(1)
            except (ElementClickInterceptedException, StaleElementReferenceException):
                driver.execute_script("arguments[0].click();", change_cluster_btn)

    logger.info("Completed cluster input validation tests")

def test_batch_edit_objects_input(driver):
    driver.delete_all_cookies()
    driver.refresh()
    driver.get("http://localhost:3000/projects/84")

    # Example tag validation cases
    tag_cases = [
        {"value": "a", "should_pass": False, "error": "Tag must be at least 2 characters."},
        {"value": "a"*31, "should_pass": False, "error": "Tag must be less than 30 characters."},
        {"value": "bad tag!", "should_pass": False, "error": "Tag contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed."},
        {"value": "valid123", "should_pass": True, "error": None},
    ]

    cluster_cases = [
        {"value": "a"*21, "should_pass": False, "error": "Cluster name must be less than 20 characters."},
        {"value": "bad$name!", "should_pass": False, "error": "Cluster name contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed."},
        {"value": "53", "should_pass": True, "error": None},
    ]

    # Find and expand the "Cluster Selection" panel
    panel_toggle = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((
            By.XPATH,
            "//div[contains(@class, 'bg-gray-800/50') and .//label[text()='Cluster Selection']]//div[contains(@class, 'flex') and contains(@class, 'cursor-pointer')]"
        ))
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", panel_toggle)
    try:
        panel_toggle.click()
    except (ElementClickInterceptedException, StaleElementReferenceException):
        driver.execute_script("arguments[0].click();", panel_toggle)

    # Wait for the first checkbox to be present and clickable
    checkbox = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((
            By.XPATH,
            "(//button[@role='checkbox' and @data-slot='checkbox'])[2]"
        ))
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", checkbox)
    try:
        checkbox.click()
    except (ElementClickInterceptedException, StaleElementReferenceException):
        driver.execute_script("arguments[0].click();", checkbox)

    # Find and click the "Search Images" button
    search_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((
            By.XPATH,
            "//button[@data-slot='button' and .//span[contains(., 'Search Images')] or contains(., 'Search Images')]"
        ))
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", search_btn)
    try:
        search_btn.click()
    except (ElementClickInterceptedException, StaleElementReferenceException):
        driver.execute_script("arguments[0].click();", search_btn)
    logger.info("Clicked Search Images button")

    # Wait for images to load
    webdriver_wait = WebDriverWait(driver, 10)
    webdriver_wait.until(
        EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'grid')]//img"))
    )
    logger.info("Images loaded")

    # Find and click the "Select" button
    select_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[@data-slot='button' and contains(., 'Select')]"))
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", select_btn)
    try:
        select_btn.click()
    except (ElementClickInterceptedException, StaleElementReferenceException):
        driver.execute_script("arguments[0].click();", select_btn)

    logger.info("Clicked Select button")

    card_headers = WebDriverWait(driver, 10).until(
        EC.presence_of_all_elements_located((By.XPATH, "//div[@data-slot='card-header' and contains(@class, 'flex')]"))
    )

    # For each of the first two card headers, find and click the checkbox (the div with border)
    for i in range(2):
        checkbox_div = card_headers[i].find_element(
            By.XPATH,
            ".//div[contains(@class, 'w-4') and contains(@class, 'h-4') and contains(@class, 'border-2')]"
        )
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", checkbox_div)
        try:
            checkbox_div.click()
        except (ElementClickInterceptedException, StaleElementReferenceException):
            driver.execute_script("arguments[0].click();", checkbox_div)
        logger.info("Selected image %d", i+1)

    # Find and click the "Edit Selected" button
    edit_selected_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='edit-selected-button'][data-slot='dialog-trigger']"))
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", edit_selected_btn)
    try:
        edit_selected_btn.click()
        logger.info("Clicked Edit Selected button")
    except (ElementClickInterceptedException, StaleElementReferenceException):
        driver.execute_script("arguments[0].click();", edit_selected_btn)

    # Locate the batch tag input field by its placeholder
    batch_tag_input = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//input[@placeholder='tag1, tag2, tag3...' and @type='text']"))
    )
    logger.info("Batch tag input field is present")

    for case in tag_cases:
        batch_tag_input.clear()
        batch_tag_input.send_keys(case["value"])
        # time.sleep(0.5)

        # Wait for the 'Add' button next to the tag input
        add_tag_btn = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//button[@data-slot='button' and contains(., 'Add')]"))
        )

        logger.info("Add Tag button is present")

        try:
            add_tag_btn.click()
            logger.info("Clicked Add Tag button")
        except (ElementClickInterceptedException, StaleElementReferenceException):
            driver.execute_script("arguments[0].click();", add_tag_btn)

        if not case["should_pass"]:
            try:
                WebDriverWait(driver, 2).until(
                    lambda d: d.find_elements(By.XPATH, f"//*[contains(text(), \"{case['error']}\")]")
                )
            except Exception:
                raise AssertionError(f"Expected error '{case['error']}' for tag '{case['value']}'")
        else:
            # Wait for dialog to close
            WebDriverWait(driver, 5).until_not(
                EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']"))
            )
            for i in range(2):
                checkbox_div = card_headers[i].find_element(
                    By.XPATH,
                    ".//div[contains(@class, 'w-4') and contains(@class, 'h-4') and contains(@class, 'border-2')]"
                )
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", checkbox_div)
                try:
                    checkbox_div.click()
                except (ElementClickInterceptedException, StaleElementReferenceException):
                    driver.execute_script("arguments[0].click();", checkbox_div)
                logger.info("Selected image %d", i+1)

            # Find and click the "Edit Selected" button
            edit_selected_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-testid='edit-selected-button'][data-slot='dialog-trigger']"))
            )
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", edit_selected_btn)
            try:
                edit_selected_btn.click()
                logger.info("Clicked Edit Selected button")
            except (ElementClickInterceptedException, StaleElementReferenceException):
                driver.execute_script("arguments[0].click();", edit_selected_btn)

    logger.info("Completed batch tag input validation tests")

    batch_cluster_input = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//input[@placeholder='New cluster name...' and @type='text']"))
    )
    logger.info("Batch cluster input field is present")

    for case in cluster_cases:
        batch_cluster_input.clear()
        batch_cluster_input.send_keys(case["value"])
        # time.sleep(0.5)

        # Wait for the 'Set' button next to the cluster input
        set_cluster_btn = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//button[@data-slot='button' and contains(., 'Move')]"))
        )

        logger.info("Move Cluster button is present")

        try:
            set_cluster_btn.click()
            logger.info("Clicked Move Cluster button")
        except (ElementClickInterceptedException, StaleElementReferenceException):
            driver.execute_script("arguments[0].click();", set_cluster_btn)

        if not case["should_pass"]:
            try:
                WebDriverWait(driver, 2).until(
                    lambda d: d.find_elements(By.XPATH, f"//*[contains(text(), \"{case['error']}\")]")
                )
            except Exception:
                raise AssertionError(f"Expected error '{case['error']}' for cluster '{case['value']}'")
        else:
            # Wait for dialog to close
            WebDriverWait(driver, 5).until_not(
                EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']"))
            )
    
        logger.info("Completed batch cluster input validation tests")

    time.sleep(1)